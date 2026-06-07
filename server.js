const express = require('express');
const app = express();
app.use(express.json());

const CONSUMER_KEY = 'u2rA5TpuKZMzgo5HNMA0Ns1QFAiMpHxGbcA5ufAVz1DVyCso';
const CONSUMER_SECRET = 'kSIF157bBzZIAjWdNnk1vAJvXUDLeiCdpdqmGmFLjiuadtBiObbylwEd62qsAW0b';
const SHORTCODE = '174379';
const PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const BASE_URL = 'https://sandbox.safaricom.co.ke';
const CALLBACK_URL = 'https://fena-mpesa.onrender.com/callback';

async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const r = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const text = await r.text();
  console.log('Token raw response:', text);
  const d = JSON.parse(text);
  return d.access_token;
}

app.get('/', (req, res) => res.send('Fena Welders Shop - Running OK'));

app.get('/payment', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fena Welders Shop - Pay</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:sans-serif;background:#f0faf2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:white;border-radius:20px;padding:32px;width:100%;max-width:400px;box-shadow:0 4px 30px rgba(0,0,0,0.1)}
.top{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.icon{width:48px;height:48px;background:#00a551;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
h1{font-size:18px;color:#111}
p{font-size:13px;color:#888}
.green-box{background:linear-gradient(135deg,#00a551,#00c96a);border-radius:16px;padding:24px;text-align:center;color:white;margin-bottom:24px}
.green-box small{font-size:12px;opacity:0.8;text-transform:uppercase;display:block;margin-bottom:6px}
.green-box big{font-size:40px;font-weight:700;display:block}
label{display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:6px}
input{width:100%;padding:14px;border:2px solid #eee;border-radius:12px;font-size:16px;margin-bottom:16px;outline:none}
input:focus{border-color:#00a551}
button{width:100%;padding:16px;background:#00a551;color:white;border:none;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer}
button:disabled{background:#aaa}
.msg{margin-top:16px;padding:14px;border-radius:12px;text-align:center;font-size:14px;display:none}
.ok{background:#e8f8ef;color:#00703a;border:1px solid #b2eac9;display:block}
.err{background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;display:block}
.wait{background:#f0f7ff;color:#1a6fb5;border:1px solid #b8d9f5;display:block}
</style>
</head>
<body>
<div class="card">
  <div class="top">
    <div class="icon">🔧</div>
    <div><h1>Fena Welders Shop</h1><p>M-Pesa Secure Checkout</p></div>
  </div>
  <div class="green-box">
    <small>AMOUNT TO PAY</small>
    <big>KSh <span id="d">0</span></big>
  </div>
  <label>Amount (KSh)</label>
  <input type="number" id="amt" placeholder="e.g. 100" min="1">
  <label>M-Pesa Phone Number</label>
  <input type="tel" id="phn" placeholder="e.g. 0712345678">
  <button id="btn" onclick="pay()">💚 Pay with M-Pesa</button>
  <div class="msg" id="msg"></div>
</div>
<script>
document.getElementById('amt').addEventListener('input', function(){
  document.getElementById('d').textContent = this.value || '0';
});

async function pay(){
  const phone = document.getElementById('phn').value.trim();
  const amount = document.getElementById('amt').value.trim();
  const btn = document.getElementById('btn');

  if(!phone || phone.length < 10){ show('Please enter a valid phone number e.g. 0712345678','err'); return; }
  if(!amount || parseInt(amount) < 1){ show('Please enter an amount','err'); return; }

  btn.disabled = true;
  btn.textContent = 'Sending...';
  show('Sending request to Safaricom...','wait');

  try {
    const res = await fetch('/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, amount: parseInt(amount) })
    });
    const text = await res.text();
    console.log('Server response:', text);
    const data = JSON.parse(text);
    if(data.success){
      show('✅ Success! Check your phone and enter your M-Pesa PIN.','ok');
      btn.textContent = '✅ Request Sent!';
    } else {
      show('❌ ' + data.message,'err');
      btn.disabled = false;
      btn.textContent = '💚 Pay with M-Pesa';
    }
  } catch(e) {
    show('❌ Error: ' + e.message,'err');
    btn.disabled = false;
    btn.textContent = '💚 Pay with M-Pesa';
  }
}

function show(t,c){
  const m = document.getElementById('msg');
  m.textContent = t;
  m.className = 'msg ' + c;
}
</script>
</body>
</html>`);
});

app.post('/pay', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    console.log('Pay request - phone:', phone, 'amount:', amount);

    const formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
    console.log('Formatted phone:', formattedPhone);

    const token = await getToken();
    if(!token){ return res.json({ success: false, message: 'Could not get Safaricom token' }); }
    console.log('Got token:', token.substring(0,10) + '...');

    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth()+1).padStart(2,'0') +
      String(now.getDate()).padStart(2,'0') +
      String(now.getHours()).padStart(2,'0') +
      String(now.getMinutes()).padStart(2,'0') +
      String(now.getSeconds()).padStart(2,'0');
    console.log('Timestamp:', timestamp);

    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString('base64');

    const body = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: 'FenaWelders',
      TransactionDesc: 'Payment'
    };

    console.log('Sending STK push...');
    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const rawText = await stkRes.text();
    console.log('STK raw response:', rawText);
    const data = JSON.parse(rawText);

    if(data.ResponseCode === '0'){
      res.json({ success: true, message: 'STK Push sent successfully!' });
    } else {
      res.json({ success: false, message: data.errorMessage || data.ResponseDescription || 'Payment failed' });
    }
  } catch(e) {
    console.error('Error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

app.post('/callback', (req, res) => {
  console.log('CALLBACK:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server started on port ' + PORT));
                     
