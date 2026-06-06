const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve payment page
app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

const CONSUMER_KEY = 'u2rA5TpuKZMzgo5HNMA0Ns1QFAiMpHxGbcA5ufAVz1DVyCso';
const CONSUMER_SECRET = 'kSIF157bBzZIAjWdNnk1vAJvXUDLeiCdpdqmGmFLjiuadtBiObbylwEd62qsAW0b';
const SHORTCODE = '174379';
const PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK_URL = 'https://fena-mpesa.onrender.com/callback';
const BASE_URL = 'https://sandbox.safaricom.co.ke';

async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  console.log('Token response:', data);
  return data.access_token;
}

app.post('/pay', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    console.log('Pay request received:', phone, amount);

    const formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

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
      AccountReference: 'FenaWeldersShop',
      TransactionDesc: 'Payment for goods'
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

    const data = await stkRes.json();
    console.log('STK response:', JSON.stringify(data));

    if (data.ResponseCode === '0') {
      res.json({ success: true, message: 'Check your phone and enter your M-Pesa PIN!' });
    } else {
      res.json({ success: false, message: data.errorMessage || data.ResponseDescription || 'Payment failed. Try again.' });
    }

  } catch (err) {
    console.error('Error:', err.message);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

app.post('/callback', (req, res) => {
  console.log('Callback:', JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

app.get('/', (req, res) => res.send('Fena Welders Shop - M-Pesa Server Running ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
