// see https://developer.twitter.com/en/docs/twitter-api/users/follows/api-reference/get-users-id-followers

const GET_FOLLOWERS_PARAMS_MAX_RESULTS = 1000;

function fetchFollowers(targetUserId, userFields) {
  const service = getService();
  if (service.hasAccess() === false) {
    throw new Error('Open the following URL and re-run the script: ' + service.getAuthorizationUrl());
  }

  const baseUrl = 'https://api.twitter.com/2/users/' + targetUserId + '/followers';
  const maxResultsParam = 'max_results=' + GET_FOLLOWERS_PARAMS_MAX_RESULTS;
  const userFieldsParam = 'user.fields=' + userFields.join(',');
  const options = {
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    },
    method : 'GET',
    muteHttpExceptions: true
  };

  const followers = [];
  let nextToken;
  do {
    let getParams = '?' + maxResultsParam + '&' + userFieldsParam;
    if(nextToken !== undefined){
      getParams += '&pagination_token=' + nextToken;
    }

    let response = UrlFetchApp.fetch(baseUrl + getParams, options);
    let result = JSON.parse(response.getContentText());

    let responseCode = response.getResponseCode();
    if(responseCode !== 200){
      throw new Error('API error. Response code is ' + response);
    }

    // The data should be in the same order as the userFields.
    for (let row of result.data){
      let rowArray = [];
      for (let fieldName of userFields){
        rowArray.push(row[fieldName]);
      }
      followers.push(rowArray);
    }
    nextToken = result.meta.next_token;

  } while(nextToken !== undefined);

  return followers;
}
