document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const singleTab = document.getElementById('tab-single');
    const multipleTab = document.getElementById('tab-multiple');

    const generateBtn = document.getElementById('generateBtn');
    const generateSingleBtn = document.getElementById('generateSingleBtn');
    const statusDiv = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const downloadBtn = document.getElementById('downloadBtn');

    const roleFileInput = document.getElementById('roleFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileLabel = document.querySelector('.file-label');

    // Hide download button initially
    downloadBtn.style.display = 'none';

    // Handle file selection display
    roleFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileNameDisplay.textContent = this.files[0].name;
            fileLabel.classList.add('has-file');
        } else {
            fileNameDisplay.textContent = 'Velg xlsx-fil...';
            fileLabel.classList.remove('has-file');
        }
    });

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.getAttribute('data-tab');
            if (tab === 'single') {
                singleTab.classList.remove('hidden');
                multipleTab.classList.add('hidden');
                generateSingleBtn.style.display = 'block';
                generateBtn.style.display = 'none';
            } else {
                multipleTab.classList.remove('hidden');
                singleTab.classList.add('hidden');
                generateBtn.style.display = 'block';
                generateSingleBtn.style.display = 'none';
            }

            errorDiv.classList.add('hidden');
            statusDiv.classList.add('hidden');
            resultDiv.classList.add('hidden');
            downloadBtn.style.display = 'none';
            generateBtn.disabled = false;
            generateSingleBtn.disabled = false;
        });
    });

    generateSingleBtn.addEventListener('click', async function() {
        const code = document.getElementById('codeSingle').value.trim().toLowerCase();
        const imei = document.getElementById('imeiSingle').value.trim();
        const phone = document.getElementById('phoneSingle').value.trim();
        const firstname = document.getElementById('firstnameSingle').value.trim();
        const lastname = document.getElementById('lastnameSingle').value.trim();

        if (!code) {
            showError('Vennligst fyll ut code-feltet');
            return;
        }
        if (!imei) {
            showError('Vennligst fyll ut IMEI');
            return;
        }
        if (!phone) {
            showError('Vennligst fyll ut telefonnummer');
            return;
        }
        if (!firstname) {
            showError('Vennligst fyll ut fornavn');
            return;
        }
        if (!lastname) {
            showError('Vennligst fyll ut etternavn');
            return;
        }

        generateSingleBtn.disabled = true;
        statusDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        downloadBtn.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = '0% ferdig';

        try {
            const response = await fetch('/generate_single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, imei, phone, firstname, lastname })
            });

            if (!response.ok) {
                let message = 'Noe gikk galt under generering av filer';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        message = errorData.error;
                    }
                } catch (e) {
                    try {
                        const text = await response.text();
                        if (text && text.trim()) {
                            message = text;
                        }
                    } catch (e2) {
                        // ignore
                    }
                }
                throw new Error(message);
            }

            const data = await response.json();
            progressBar.style.width = '100%';
            progressText.textContent = '100% ferdig';

            downloadBtn.href = data.download_url;
            downloadBtn.download = data.filename;
            downloadBtn.style.display = 'block';
            statusDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
            resultDiv.querySelector('p').textContent = 'Ferdig! Klikk på knappen under for å laste ned.';
        } catch (error) {
            showError(error.message || 'En feil oppstod under generering av filer.');
        } finally {
            generateSingleBtn.disabled = false;
        }
    });

    generateBtn.addEventListener('click', async function() {
        const code = document.getElementById('code').value.trim().toUpperCase();
        const start = document.getElementById('start').value;
        const end = document.getElementById('end').value;
        const roleFile = roleFileInput.files[0];

        // Validate input
        if (!code) {
            showError('Vennligst fyll ut kode-feltet');
            return;
        }

        if (!roleFile) {
            if (!start || !end || parseInt(start) >= parseInt(end)) {
                showError('Ugyldig nummerintervall. Startnummer må være mindre enn sluttnummer.');
                return;
            }
        }

        // Reset UI
        generateBtn.disabled = true;
        statusDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        downloadBtn.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = '0% ferdig';

        try {
            // Build FormData to support file upload
            const formData = new FormData();
            formData.append('code', code);
            formData.append('start', parseInt(start || 0));
            formData.append('end', parseInt(end || 0));
            if (roleFile) {
                formData.append('roleFile', roleFile);
            }

            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let message = 'Noe gikk galt under generering av filer';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        message = errorData.error;
                    }
                } catch (e) {
                    try {
                        const text = await response.text();
                        if (text && text.trim()) {
                            message = text;
                        }
                    } catch (e2) {
                        // ignore
                    }
                }
                throw new Error(message);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const text = decoder.decode(value);
                const lines = text.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6).trim());
                            
                            if (data.progress !== undefined) {
                                // Update progress
                                progressBar.style.width = `${data.progress}%`;
                                progressText.textContent = `${data.progress}% ferdig`;
                            }
                            
                            if (data.complete) {
                                // Show download button when complete
                                downloadBtn.href = data.download_url;
                                downloadBtn.download = data.filename;
                                downloadBtn.style.display = 'block';
                                generateBtn.style.display = 'none';
                                statusDiv.classList.add('hidden');
                                resultDiv.classList.remove('hidden');
                                resultDiv.querySelector('p').textContent = 'Ferdig! Klikk på knappen under for å laste ned.';
                            }
                            
                            if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            console.error('Error parsing message:', e);
                        }
                    }
                }
            }
        } catch (error) {
            showError(error.message || 'En feil oppstod under generering av filer.');
        } finally {
            generateBtn.disabled = false;
        }
    });

    function showError(message) {
        errorDiv.querySelector('p').textContent = message;
        errorDiv.classList.remove('hidden');
        statusDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
    }
});