/* Portfolio – Kontaktformular mit Supabase */

const SUPABASE_URL = 'https://kxtxviyspjhwjrfwjxcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4dHh2aXlzcGpod2pyZndqeGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1Mzg4MTQsImV4cCI6MjEwMjExNDgxNH0.vAUPrjlT6KC7KX0cVDE3ZuQr17HCehdU1f0JZsCsRKk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const form = document.getElementById('kontakt-form');
const messageEl = document.getElementById('form-message');
const submitBtn = document.getElementById('form-submit');

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = 'form-message form-message--' + type;
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  messageEl.className = 'form-message';

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Wird gesendet …';

  const interesse = Array.from(form.querySelectorAll('input[name="interesse"]:checked'))
    .map(function (checkbox) { return checkbox.value; });

  const { error } = await supabase.from('kontaktanfragen').insert([{
    vorname: form.vorname.value.trim(),
    nachname: form.nachname.value.trim(),
    unternehmen: form.unternehmen.value.trim() || null,
    email: form.email.value.trim(),
    telefon: form.telefon.value.trim() || null,
    nachricht: form.nachricht.value.trim(),
    interesse: interesse.length ? interesse : null
  }]);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Senden';

  if (error) {
    showMessage('Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie direkt an info@gittens-consulting.de.', 'error');
    return;
  }

  form.reset();
  showMessage('Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet. Ich melde mich in Kürze bei Ihnen.', 'success');
});
