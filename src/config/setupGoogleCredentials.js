const fs = require("fs");
const path = require("path");
const os = require("os");

function setupGoogleCredentials() {
  const b64 = process.env.GOOGLE_CREDENTIALS_B64;

  if (!b64) {
    console.error(
      "Falta GOOGLE_CREDENTIALS_B64 en las variables de entorno"
    );
    return;
  }

  let jsonText;
  let parsed;

  try {
    jsonText = Buffer.from(b64, "base64").toString("utf8");
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error(
      "GOOGLE_CREDENTIALS_B64 no contiene credenciales JSON válidas:",
      error.message
    );
    return;
  }

  try {
    const filePath = path.join(
      os.tmpdir(),
      "google-credentials.json"
    );

    fs.writeFileSync(
      filePath,
      JSON.stringify(parsed),
      {
        encoding: "utf8",
        mode: 0o600,
      }
    );

    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      filePath;

    if (!process.env.GOOGLE_PROJECT_ID && parsed.project_id) {
      process.env.GOOGLE_PROJECT_ID =
        parsed.project_id;
    }

    console.log(
      "Credenciales de Google configuradas correctamente"
    );

    console.log(
      "GOOGLE_APPLICATION_CREDENTIALS:",
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );

    console.log(
      "GOOGLE_PROJECT_ID:",
      process.env.GOOGLE_PROJECT_ID
    );
  } catch (error) {
    console.error(
      "No fue posible crear el archivo temporal de credenciales:",
      error.message
    );
  }
}

module.exports = {
  setupGoogleCredentials,
};
