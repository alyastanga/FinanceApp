async function check() {
  const toCurrency = 'PHP';
  try {
    const fResponse = await fetch(`https://api.frankfurter.dev/v1/latest?from=USD&to=${toCurrency}`);
    const fData = await fResponse.json();
    console.log(`Frankfurter Result for ${toCurrency}:`, JSON.stringify(fData));
  } catch (e) {
    console.error(`Error for ${toCurrency}:`, e.message);
  }
}

check();
