# SafeWalk Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] Firebase account created
- [ ] TomTom API key obtained
- [ ] OpenWeather API key obtained
- [ ] (Optional) Twilio account for SMS alerts
- [ ] (Optional) SMTP credentials for email alerts

## Step-by-Step Setup

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → **Email/Password**
4. Create **Firestore Database** (start in test mode, we'll add rules)
5. Go to **Project Settings** → **Service Accounts**
6. Click **Generate New Private Key** → Download JSON
7. Copy the JSON content (you'll need it for backend `.env`)

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

TOMTOM_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here

# Paste the entire Firebase service account JSON as a string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Optional: Email alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=safewalk@example.com

# Optional: SMS alerts
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

Start backend:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_API_BASE_URL=http://localhost:5000
```

Get these values from Firebase Console → Project Settings → General → Your apps → Web app config.

Start frontend:
```bash
npm run dev
```

### 4. Firestore Rules

1. Go to Firebase Console → Firestore Database → Rules
2. Copy content from `firebase/firestore.rules`
3. Paste and **Publish**

### 5. Test the Application

1. Open http://localhost:3000
2. Sign up with a new account
3. Try finding a route:
   - Enter destination coordinates (e.g., `40.7589,-73.9851`)
   - Adjust safety preference slider
   - Click "Find Safest Route"
4. Submit a report on the Reports page
5. Test panic button (add trusted contacts first)

## Troubleshooting

### Backend won't start
- Check all environment variables are set
- Verify Firebase service account JSON is valid
- Check port 5000 is not in use

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check `VITE_API_BASE_URL` in frontend `.env`

### Firebase auth not working
- Verify Email/Password auth is enabled
- Check Firebase config values in frontend `.env`

### Routes not loading
- Verify TomTom API key is correct
- Check backend logs for API errors
- Ensure you have TomTom API credits

### Reports not showing
- Check Firestore rules are deployed
- Verify reports collection exists
- Check browser console for errors

## Next Steps

- Configure TTL for reports (auto-delete after 30 min)
- Set up email/SMS for panic alerts
- Customize safety weights in `backend/services/safetyService.js`
- Add more map features (geocoding, etc.)

