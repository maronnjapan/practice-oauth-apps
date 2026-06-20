const fs = require('fs');
const path = require('path');
const generatePrivateKey = async () => {
    const keyPair = await crypto.subtle.generateKey(
        {
            // RS256（RSASSA-PKCS1-v1_5 + SHA-256）用の鍵ペアを生成する
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ["sign", "verify"]
    );

    const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

    console.log("Private Key:\n", JSON.stringify(privateKey));
    console.log("Public Key:\n", JSON.stringify(publicKey));

    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.error(`.env file not found at ${envPath}`);
        return;
    }
    const envContent = fs.readFileSync(envPath, 'utf-8');
    if (!/PRIVATE_KEY='.*?'/g.test(envContent) || !/PUBLIC_KEY='.*?'/g.test(envContent)) {
        console.error(`.env file at ${envPath} does not contain PRIVATE_KEY or PUBLIC_KEY placeholders`);
        return;
    }
    const newEnvContent = envContent
        .replace(/PRIVATE_KEY='.*?'/, `PRIVATE_KEY='${JSON.stringify(privateKey)}'`)
        .replace(/PUBLIC_KEY='.*?'/, `PUBLIC_KEY='${JSON.stringify(publicKey)}'`);
    fs.writeFileSync(envPath, newEnvContent);
    console.log(`Updated .env file at ${envPath}`);

}

generatePrivateKey().catch(console.error);