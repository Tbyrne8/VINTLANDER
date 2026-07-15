# VINTLANDER Google neural radio

This Cloud Run service keeps Google credentials out of the public GitHub Pages app.

Enable the Cloud Text-to-Speech and Cloud Run APIs in the existing Google Cloud project, then deploy this directory:

```text
gcloud run deploy vintlander-radio --source cloud/google-tts --region europe-west1 --allow-unauthenticated --set-env-vars ALLOWED_ORIGINS=https://tbyrne8.github.io,http://localhost:5173
```

Grant the Cloud Run service account the minimum Text-to-Speech permission required by the project. Add the deployed `/synthesize` URL to the GitHub Actions secret `VITE_GOOGLE_TTS_ENDPOINT`.

Set Cloud Run request limits and a Google Cloud budget alert before public use. The service checks browser origins, but public web endpoints can still receive non-browser requests.
