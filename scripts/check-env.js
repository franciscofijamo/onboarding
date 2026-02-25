const fs = require('fs');
const path = require('path');

// Try to read .env file directly first to see what's in it (without printing secrets)
const envPath = path.join(process.cwd(), '.env');

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ .env file found.');

    const lines = envContent.split('\n');
    const apiKeyLine = lines.find(line => line.trim().startsWith('ASAAS_API_KEY='));

    if (apiKeyLine) {
        console.log('✅ ASAAS_API_KEY found in .env file.');
        const value = apiKeyLine.split('=')[1].trim();

        if (value.startsWith("'") && value.endsWith("'")) {
            console.log('ℹ️  Value is single-quoted.');
        } else if (value.startsWith('"') && value.endsWith('"')) {
            console.log('ℹ️  Value is double-quoted.');
        } else {
            console.log('ℹ️  Value is not quoted.');
        }

        if (value.includes('$')) {
            console.log('⚠️  Value contains "$". This might cause variable expansion issues if not escaped or strictly quoted.');
        }
    } else {
        console.error('❌ ASAAS_API_KEY NOT found in .env file content.');
    }

} catch (err) {
    console.error('❌ Could not read .env file:', err.message);
}

// Now check process.env (requires running with --env-file or dotenv)
console.log('\nChecking process.env...');
if (process.env.ASAAS_API_KEY) {
    console.log('✅ process.env.ASAAS_API_KEY is set.');
    console.log('Length:', process.env.ASAAS_API_KEY.length);
    console.log('First 5 chars:', process.env.ASAAS_API_KEY.substring(0, 5));
} else {
    console.error('❌ process.env.ASAAS_API_KEY is NOT set.');
}
