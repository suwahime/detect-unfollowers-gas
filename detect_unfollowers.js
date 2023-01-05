const GET_FOLLOWERS_PARAMS_USER_FIELDS = ['profile_image_url','id','name','username','description','created_at','location','url','pinned_tweet_id','protected','public_metrics','verified'];
const UNFOLLOWERS_SHEET_COLUMNS = GET_FOLLOWERS_PARAMS_USER_FIELDS.concat(['timestamp']);

function detectUnfollowers() {
  const currentTime = new Date();
  const scriptProps = PropertiesService.getScriptProperties();
  const targetUserId = scriptProps.getProperty('MY_TWITTER_ID');

  const followers = fetchFollowers(targetUserId, GET_FOLLOWERS_PARAMS_USER_FIELDS);

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  const latestSheet = getLatestSheet(spreadsheet);
  const beforeSheet = renewBeforeSheet(spreadsheet, latestSheet);
  recordFollowers(latestSheet, followers);

  const unfollowers = diffFollowers(beforeSheet, latestSheet);

  const unfollowersSheet = getUnfollowersSheet(spreadsheet);

  addUnfollowers(unfollowersSheet, unfollowers, currentTime);
}

function recordFollowers(sheet, followers){
  initFollowerSheet(sheet, GET_FOLLOWERS_PARAMS_USER_FIELDS);
  sheet.getRange(2, 1, followers.length, GET_FOLLOWERS_PARAMS_USER_FIELDS.length).setValues(followers);
}

function addUnfollowers(unfollowersSheet, unfollowers, timestamp){
  if(unfollowers.length == 0){
    return;
  }
  unfollowers.map(unfollower => unfollower.push(timestamp));
  unfollowersSheet.getRange(unfollowersSheet.getLastRow() + 1, 1, unfollowers.length, UNFOLLOWERS_SHEET_COLUMNS.length).setValues(unfollowers);
}

function diffFollowers(beforeSheet, latestSheet){
  if(beforeSheet.getLastRow() < 2){
    return [];
  }

  const userIdIndex = GET_FOLLOWERS_PARAMS_USER_FIELDS.indexOf('id');
  const beforeFollowers = beforeSheet.getRange(2, 1, beforeSheet.getLastRow() - 1, GET_FOLLOWERS_PARAMS_USER_FIELDS.length).getValues();
  const latestIdValues = latestSheet.getRange(2, userIdIndex + 1, latestSheet.getLastRow() - 1, 1).getValues();
  const latestIds = latestIdValues.reduce((pre,current) => {pre.push(...current);return pre},[]);
  
  const unfollowers = [];
  for(let i = 0; i < beforeFollowers.length; i++){
    if(!latestIds.includes(beforeFollowers[i][userIdIndex])){
      unfollowers.push(beforeFollowers[i]);
    }
  }

  return unfollowers;
}

function initFollowerSheet(sheet, headerColumns){
  sheet.getRange(1, 1, 1, headerColumns.length).setValues([headerColumns]);
  sheet.setFrozenRows(1);

  // Delete all lines after the third line.
  // Only the header line cannot be left.
  // Therefore, the second line should be clearContent.
  const lastRow = sheet.getLastRow();
  if(lastRow >= 3) {
    sheet.deleteRows(3, lastRow - 2);
  }
  const contentRange = sheet.getRange(2, 1, 1, headerColumns.length);
  if(contentRange === null){
    return;
  }
  contentRange.clearContent();
}

function getLatestSheet(spreadsheet){
  let latestSheet = spreadsheet.getSheetByName('latest_followers');
  if(latestSheet == null){
    latestSheet = spreadsheet.insertSheet('latest_followers');
    initFollowerSheet(latestSheet, GET_FOLLOWERS_PARAMS_USER_FIELDS);
  }
  return latestSheet;
}

function getUnfollowersSheet(spreadsheet){
  let unfollowersSheet = spreadsheet.getSheetByName('unfollowers');
  if(unfollowersSheet == null){
    unfollowersSheet = spreadsheet.insertSheet('unfollowers');
    initFollowerSheet(unfollowersSheet, UNFOLLOWERS_SHEET_COLUMNS);
  }
  return unfollowersSheet;
}

function renewBeforeSheet(spreadsheet, latestSheet){
  let beforeSheet = spreadsheet.getSheetByName('before_followers');
  if(beforeSheet == null) {
    beforeSheet = spreadsheet.insertSheet('before_followers');
    initFollowerSheet(beforeSheet, GET_FOLLOWERS_PARAMS_USER_FIELDS);
    return beforeSheet;
  }

  spreadsheet.deleteSheet(beforeSheet);
  const new_beforeSheet = latestSheet.copyTo(spreadsheet);
  new_beforeSheet.setName('before_followers');

  return new_beforeSheet;
}
