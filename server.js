const http = require('http');
const https = require('https');

const CONSUMER_KEY = 'u2rA5TpuKZMzgo5HNMA0Ns1QFAiMpHxGbcA5ufAVz1DVyCso';
const CONSUMER_SECRET = 'kSIF157bBzZIAjWdNnk1vAJvXUDLeiCdpdqmGmFLjiuadtBiObbylwEd62qsAW0b';
const SHORTCODE = '174379';
const PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK_URL = 'https://fena-mpesa.onrender.com/callback';

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fena Welders Shop - Pay</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:sans-serif;background:#f0faf2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:20px;padding:32px;width:100%;max-width:400px;box-shadow:0 4px 30px rgba(0,0,0,.1)}
.top{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.icon{width:48px;height:48px;background:#00a551;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
h1{font-size:18px;color:#111}
.sub{font-size:13px;color:#888}
.box{background:linear-gradient(135deg,#00a551,#00c96a);border-radius:16px;padding:24px;text-align:center;color:#fff;margin-bottom:24px}
.box small{font-size:12px;opacity:.8;text-transform:uppercase;display:block;margin-bottom:6px}
.box big{font-size:40px;font-weight:700;display:block}
label{display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:6px}
input{width:100%;padding:14px;border:2px solid #eee;border-radius:12px;font-size:16px;margin-bottom:16px;outline:none}
input:focus{border-color:#00a551}
button{width:100%;padding:16px;background:#00a551;color:#fff;border:none;border-radius:12px;font-size:17px;font-weight:700;cursor:pointer}
button:disabled{background:#aaa;cursor:not-allowed}
.msg{margin-top:16px;padding:14px;border-radius:12px;text-align:center;font-size:14px;display:none}
.ok{background:#e8f8ef;color:#00703a;border:1px solid #b2eac9;display:block}
.err{background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;display:block}
.wait{background:#f0f7ff;color:#1a6fb5;border:1px solid #b8d9f5;display:block}
.badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:18px;color:#aaa;font-size:12px}
.badge b{color:#00a551}
</style>
</head>
<body>
<div class="card">
  <div class="top">
    <div class="icon">🔧</div>
    <div><h1>Fena Welders Shop</h1><span class="sub">M-Pesa Secure Checkout</span></div>
  </div>
  <div class="box">
    <small>Amount to Pay</small>
    <big>KSh <span id="disp">0</span></big>
  </div>
  <label>Amount (KSh)</label>
  <input type="number" id="amt" placeholder="e.g. 500" min="1">
  <label>M-Pesa Phone Number</label>
  <input type="tel" id="phn" placeholder="e.g. 0712345678" maxlength="10">
  <button id="btn" onclick="pay()">💚 Pay with M-Pesa</button>
  <div class="msg" id="msg"></div>
  <div class="badge">🔒 Secured by <b>M-Pesa</b> · Safaricom</div>
</div>
<script>
document.getElementById('amt').addEventListener('input',function(){
  document.getElementById('disp').textContent=this.value||'0';
});
async function pay(){
  const phone=document.getElementById('phn').value.trim();
  const amount=document.getElementById('amt').value.trim();
  const btn=document.getElementById('btn');
  if(!phone||phone.length<10){show('Please enter a valid 10-digit phone number','err');return;}
  if(!amount||parseInt(amount)<1){show('Please enter an amount greater than 0','err');return;}
  btn.disabled=true;btn.textContent='Sending...';
  show('Sending STK Push to your phone, please wait...','wait');
  try{
    const r=await fetch('/pay',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:phone,amount:parseInt(amount)})
    });
    const d=await r.json();
    if(d.success){
      show('✅ Request sent! Check your phone and enter your M-Pesa PIN.','ok');
      btn.textContent='✅ Sent!';
    } else {
      show('❌ '+d.message,'err');
      btn.disabled=false;btn.textContent='💚 Pay with M-Pesa';
    }
  } catch(e){
    show('❌ '+e.message,'err');
    btn.disabled=false;btn.textContent='💚 Pay with M-Pesa';
  }
}
function show(t,c){const m=document.getElementById('msg');m.textContent=t;m.className='msg '+c;}
</script>
</body>
</html>`;

function safaricomRequest(path, method, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'sandbox.safaricom.co.ke',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : `Basic ${Buffer.from(CONSUMER_KEY+':'+CONSUMER_SECRET).toString('base64')}`
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        console.log('Response from Safaricom:', raw);
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('Safaricom returned invalid response: ' + raw)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  const data = await safaricomRequest('/oauth/v1/generate?grant_type=client_credentials', 'GET', null, null);
  return data.access_token;
}

async function stkPush(phone, amount) {
  const token = await getToken();
  const now = new Date();
  const ts = now.getFullYear().toString()
    + String(now.getMonth()+1).padStart(2,'0')
    + String(now.getDate()).padStart(2,'0')
    + String(now.getHours()).padStart(2,'0')
    + String(now.getMinutes()).padStart(2,'0')
    + String(now.getSeconds()).padStart(2,'0');
  const password = Buffer.from(SHORTCODE + PASSKEY + ts).toString('base64');
  const formattedPhone = phone.startsWith('0') ? '254'+phone.slice(1) : phone;
  return safaricomRequest('/mpesa/stkpush/v1/processrequest', 'POST', {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: CALLBACK_URL,
    AccountReference: 'FenaWelders',
    TransactionDesc: 'Payment for goods'
  }, token);
}

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  // Serve payment page
  if (method === 'GET' && url === '/payment') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    return res.end(HTML);
  }

  // Health check
  if (method === 'GET' && url === '/') {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    return res.end('Fena Welders Shop - M-Pesa Server Running OK');
  }

  // STK Push
  if (method === 'POST' && url === '/pay') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { phone, amount } = JSON.parse(body);
        console.log('Pay request - phone:', phone, 'amount:', amount);
        const result = await stkPush(phone, amount);
        console.log('STK result:', result);
        res.writeHead(200, {'Content-Type': 'application/json'});
        if (result.ResponseCode === '0') {
          res.end(JSON.stringify({ success: true, message: 'STK Push sent!' }));
        } else {
          res.end(JSON.stringify({ success: false, message: result.errorMessage || result.ResponseDescription || 'Payment failed' }));
        }
      } catch(e) {
        console.error('Error:', e.message);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: false, message: e.message }));
      }
    });
    return;
  }

  // Callback
  if (method === 'POST' && url === '/callback') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('M-Pesa Callback:', body);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ ResultCode: 0, ResultDesc: 'OK' }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
