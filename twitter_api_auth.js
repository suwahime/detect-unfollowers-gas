function getService() {
  pkceChallengeVerifier();

  const userProps = PropertiesService.getUserProperties();
  const scriptProps = PropertiesService.getScriptProperties();
  const clientId = scriptProps.getProperty('TWITTER_API_CLIENT_ID');
  const clientSecret = scriptProps.getProperty('TWITTER_API_CLIENT_SECRET');
  const scopes = scriptProps.getProperty('TWITTER_API_OAUTH_SCOPES');

  return OAuth2.createService('twitter')
    .setAuthorizationBaseUrl('https://twitter.com/i/oauth2/authorize')
    .setTokenUrl('https://api.twitter.com/2/oauth2/token?code_verifier=' + userProps.getProperty("code_verifier"))
    .setClientId(clientId)
    .setClientSecret(clientSecret)
    .setCallbackFunction('authCallback')
    .setPropertyStore(userProps)
    .setScope(scopes)
    .setParam('response_type', 'code')
    .setParam('code_challenge_method', 'S256')
    .setParam('code_challenge', userProps.getProperty("code_challenge"))
    .setTokenHeaders({
      'Authorization': 'Basic ' + Utilities.base64Encode(clientId + ':' + clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    })
}

function authCallback(request) {
  const service = getService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}

function pkceChallengeVerifier() {
  let userProps = PropertiesService.getUserProperties();
  if (!userProps.getProperty("code_verifier")) {
    let verifier = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

    for (let i = 0; i < 128; i++) {
      verifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    let sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier)

    let challenge = Utilities.base64Encode(sha256Hash)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    userProps.setProperty("code_verifier", verifier)
    userProps.setProperty("code_challenge", challenge)
  }
}