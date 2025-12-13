from flask import Flask, render_template, request, jsonify, send_file, Response, stream_with_context
import os
import json
import zipfile
import io
import shutil
import secrets
import string
from openpyxl import Workbook, load_workbook

app = Flask(__name__)

# Ensure output directories exist
os.makedirs('avaya', exist_ok=True)
os.makedirs('ascom', exist_ok=True)

def generate_secure_password(length=15):
    # Define character sets (no special characters)
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    
    # Ensure at least one character from each set
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits)
    ]
    
    # Fill the rest with random characters from all sets
    all_chars = lowercase + uppercase + digits
    for _ in range(length - len(password)):
        password.append(secrets.choice(all_chars))
    
    # Shuffle to avoid predictable patterns
    secrets.SystemRandom().shuffle(password)
    return ''.join(password)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_files():
    # Handle both FormData and JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        code = request.form.get('code', '').strip().lower()
        start_num = int(request.form.get('start', 0))
        end_num = int(request.form.get('end', 0))
        role_file = request.files.get('roleFile')
    else:
        data = request.get_json()
        code = data.get('code', '').strip().lower()
        start_num = int(data.get('start', 0))
        end_num = int(data.get('end', 0))
        role_file = None
    
    # Validate input
    if not code or start_num >= end_num or not code.strip():
        return jsonify({'error': 'Vennligst fyll ut alle feltene korrekt. Kode er påkrevd.'}), 400
    
    # Read role names from xlsx if provided
    role_names = []
    if role_file:
        try:
            wb = load_workbook(role_file)
            ws = wb.active
            for row in ws.iter_rows(min_col=1, max_col=1, values_only=True):
                if row[0]:
                    role_names.append(str(row[0]))
        except Exception as e:
            return jsonify({'error': f'Kunne ikke lese xlsx-fil: {str(e)}'}), 400
    
    # Clear previous files
    shutil.rmtree('avaya', ignore_errors=True)
    shutil.rmtree('ascom', ignore_errors=True)
    os.makedirs('avaya', exist_ok=True)
    os.makedirs('ascom', exist_ok=True)
    
    total_files = end_num - start_num + 1
    temp_zip = f"temp_{code}_{start_num}_{end_num}.zip"
    
    # Store data for output xlsx
    output_data = []
    
    def generate():
        # Generate files
        for i, number in enumerate(range(start_num, end_num + 1), 1):
            # Generate cryptographically secure password
            password = generate_secure_password()
            
            # Get role name if available
            role_name = role_names[i-1] if i-1 < len(role_names) else ''
            
            # Store data for output xlsx
            output_data.append({
                'role_name': role_name,
                'hl_code': f'HL {code.upper()}',
                'number': number,
                'password': password
            })
            
            # Generate .phn file with the secure password
            phn_content = f"SET SIPUSERNAME {number}\nSET SIPUSERPASSWORD {password}\nGET /mdm/{code}/avaya/rw-sikt.txt"
            phn_filename = f"{code}{number}.phn"
            with open(f"avaya/{phn_filename}", 'w') as f:
                f.write(phn_content)
            
            # Generate .json file
            full_value = f"{number}"
            json_content = {"voip_device_id": full_value}
            json_filename = f"{full_value}.json"
            with open(f"ascom/{json_filename}", 'w') as f:
                json.dump(json_content, f, indent=2)
            
            # Calculate and send progress (only send every 10 files or at completion to reduce overhead)
            if i % 10 == 0 or i == total_files:
                progress = int((i / total_files) * 100)
                yield f"data: {json.dumps({'progress': progress})}\n\n"
        
        # Create output xlsx with role mappings
        output_wb = Workbook()
        output_ws = output_wb.active
        output_ws.title = 'Rollemapping'
        
        # Add headers
        output_ws['A1'] = 'Rollenavn'
        output_ws['B1'] = 'HL-kode'
        output_ws['C1'] = 'Nummer'
        output_ws['D1'] = 'Passord'
        
        # Add data
        for idx, data_row in enumerate(output_data, start=2):
            output_ws[f'A{idx}'] = data_row['role_name']
            output_ws[f'B{idx}'] = data_row['hl_code']
            output_ws[f'C{idx}'] = data_row['number']
            output_ws[f'D{idx}'] = data_row['password']
        
        # Save output xlsx
        output_xlsx_path = f'output_{code}.xlsx'
        output_wb.save(output_xlsx_path)
        
        # Create zip file
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            # Add avaya files
            for root, dirs, files in os.walk('avaya'):
                for file in files:
                    zf.write(os.path.join(root, file), 
                            os.path.join('avaya', file))
            
            # Add ascom files
            for root, dirs, files in os.walk('ascom'):
                for file in files:
                    zf.write(os.path.join(root, file), 
                            os.path.join('ascom', file))
            
            # Add output xlsx to root of zip
            zf.write(output_xlsx_path, output_xlsx_path)
        
        memory_file.seek(0)
        
        # Save zip to a temporary file
        with open(temp_zip, 'wb') as f:
            f.write(memory_file.getvalue())
        
        # Clean up
        shutil.rmtree('avaya', ignore_errors=True)
        shutil.rmtree('ascom', ignore_errors=True)
        if os.path.exists(output_xlsx_path):
            os.remove(output_xlsx_path)
        
        # Send completion event
        yield f"data: {json.dumps({'complete': True, 'download_url': f'/download/{temp_zip}', 'filename': f'generated_files_{code}_{start_num}-{end_num}.zip'})}\n\n"
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/download/<filename>')
def download_file(filename):
    # Security check: only allow temp_ prefixed files
    if not filename.startswith('temp_') or '..' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    
    response = send_file(
        filename,
        as_attachment=True,
        download_name=filename.replace('temp_', '')
    )
    
    # Clean up temp file after sending
    @response.call_on_close
    def cleanup():
        try:
            if os.path.exists(filename):
                os.remove(filename)
        except Exception:
            pass
    
    return response

if __name__ == '__main__':
    app.run(debug=True)