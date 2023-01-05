// シートのヘッダーに当たる部分の行のindex。この次の行からデータを挿入する
const HEADER_ROW_INDEX = 0; // 0…1列目がヘッダー
// データを挿入する左端にあたる列のindex
const LEFT_END_COLUMN_INDEX = 1; // 1…B列からデータが入る

// userの画像を表示する列のindex
const PROFILE_IMAGE_URL_COLUMN_INDEX = 1; // 1…B列に入っている
// user.idが入っている列のindex
const USER_ID_COLUMN_INDEX = 2; // 2…C列に入っている
// usernameが入っている列のindex
const USERNAME_COLUMN_INDEX = 4; // 4…E列に入っている
// userの画像を表示する列のindex
const PROFILE_IMAGE_COLUMN_INDEX = 0; // 0…A列に入っている

// PROFILE_IMAGE_COLUMN_INDEXから見て、profile_image_urlがどこにあるかをR1C1形式で表現した文字列
const PROFILE_IMAGE_URL_R1C1 = 'RC[1]'; // 右隣

// followers API のGETパラメータ
const GET_PARAM_MAX_RESULTS = 'max_results=1000';
const GET_PARAM_USER_FIELDS = 'user.fields=created_at,description,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified';
// 上記の user.fields の要素の数
const USER_FIELDS_NUM = 12;

// 5000フォロワー居ると1回の実行でAPIを5回消費してしまうので、1回にするデバグフラグ
const DEBUG_API_AT_ONCE = false;

function main() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  latestSheet = spreadsheet.getSheetByName('latest_followers');

  // Twitter API を叩いてフォロワーリスト取得する
  let headerRow = latestSheet.getDataRange().getValues()[HEADER_ROW_INDEX];
  let followersArray = createFollowerArray(headerRow);

  // フォロワーリストをシートに保存する
  if(followersArray.length > 0){
    // 差分用にbeforeリストをシートごと作り直す
    renewBeforeSheet(spreadsheet, latestSheet);
    // latestSheetを空にする
    truncateTable(latestSheet);
    // データを書き込む
    latestSheet.getRange(HEADER_ROW_INDEX + 2, LEFT_END_COLUMN_INDEX, followersArray.length, LEFT_END_COLUMN_INDEX + USER_FIELDS_NUM).setValues(followersArray);
    // 画像が表示されるようにImageUrlの列を更新する
    fillImageUrl(latestSheet, PROFILE_IMAGE_COLUMN_INDEX);  
  }

  let beforeSheet = spreadsheet.getSheetByName('before_followers');
  let beforeFollowers = beforeSheet.getRange(HEADER_ROW_INDEX + 2, LEFT_END_COLUMN_INDEX + 1, beforeSheet.getLastRow() - 1, beforeSheet.getLastColumn() - 1).getValues();
  let latestIdValues = latestSheet.getRange(HEADER_ROW_INDEX + 2, USER_ID_COLUMN_INDEX + 1, latestSheet.getLastRow() - 1, 1).getValues();
  // 1次元配列に直す
  let latestIds = latestIdValues.reduce((pre,current) => {pre.push(...current);return pre},[]);
  
  // unfollowした人を探す
  let unfollowUsers = [];
  var currentTime  = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  // 配列のindexは、表のCLUMUN_INDEXから、LEFT_END_COLUMN_INDEXの分だけズレている
  let userIdIndex = USER_ID_COLUMN_INDEX - LEFT_END_COLUMN_INDEX;
  let profileImageUrlIndex = PROFILE_IMAGE_URL_COLUMN_INDEX - LEFT_END_COLUMN_INDEX;
  let usernameIndex = USERNAME_COLUMN_INDEX - LEFT_END_COLUMN_INDEX;
  for(let i = 0; i < beforeFollowers.length; i++){
    if(!latestIds.includes(beforeFollowers[i][userIdIndex])){
      let unfollowUser = {
        time      : currentTime,
        image     : null,
        imageUrl  : beforeFollowers[i][profileImageUrlIndex],
        id        : beforeFollowers[i][userIdIndex],
        url       : 'https://twitter.com/' + beforeFollowers[i][usernameIndex]
      };
      unfollowUsers.push(unfollowUser);
    }
  }

  // unfollowした人を追記する
  if(unfollowUsers.length > 0){
    diff_sheet = spreadsheet.getSheetByName('diff');
    // truncateはせず、最後の行に追加する
    diff_sheet.getRange(diff_sheet.getLastRow() + 1, 1, unfollows.length, unfollows[0].length).setValues(unfollows);
    fillImageUrl(diff_sheet, 1);
  }
}

function truncateTable(sheet){
  // データの2行目以降を、全行削除する
  let lastRow = sheet.getLastRow();
  if(lastRow >= HEADER_ROW_INDEX + 3) {
    sheet.deleteRows(HEADER_ROW_INDEX + 3, lastRow - 2);
  }

  // ヘッダ行だけを残すことができない仕様のため、余った1行だけはclearContentする
  let contentRange = sheet.getRange(HEADER_ROW_INDEX + 2, 1, 1, sheet.getLastColumn());
  if(contentRange === null){
    return;
  }
  contentRange.clearContent();
}

function createFollowerArray(headerRow){
  const scriptProps = PropertiesService.getScriptProperties();
  const url = 'https://api.twitter.com/2/users/' + scriptProps.getProperty('MY_TWITTER_ID') + '/followers';
  const service = getService();
  if (service.hasAccess() === false) {
    const authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
    return;
  }

  let followersArray = [];
  let response, result, nextToken;
  do {
    let params = '?'+GET_PARAM_MAX_RESULTS+'&'+GET_PARAM_USER_FIELDS;
    if(nextToken !== undefined){
      params += '&pagination_token='+nextToken;
    }

    let options = {
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      },
      method : 'GET',
      muteHttpExceptions: true
    };

    response = UrlFetchApp.fetch(url + params, options);
    result = JSON.parse(response.getContentText());

    let responseCode = response.getResponseCode();
    if(responseCode !== 200){
      Logger.log('Error. Response = ' + response);
      return [];
    }

    for (let row of result.data){
      let rowArray = [];
      for (let colName of headerRow){
        rowArray.push(row[colName]);
      }
      followersArray.push(rowArray);
    }

    if(DEBUG_API_AT_ONCE){
      break;
    }
    nextToken = result.meta.next_token;

  } while(nextToken !== undefined);

  return followersArray;
}

function fillImageUrl(sheet, columnIndex){
  let range = sheet.getRange(HEADER_ROW_INDEX + 2, columnIndex + 1, sheet.getLastRow() - 1, 1);
  let followerNum = range.getNumRows();
  let formulasR1C1 = [];

  let value = '=IMAGE('+PROFILE_IMAGE_URL_R1C1+')';
  for(let i = 0; i < followerNum; i++){
    formulasR1C1.push([value]);
  }

  range.setFormulasR1C1(formulasR1C1);
}

function renewBeforeSheet(spreadsheet, latestSheet){
  let beforeSheet = spreadsheet.getSheetByName('before_followers');
  if(beforeSheet != null) {
    spreadsheet.deleteSheet(beforeSheet);
  }
  
  new_beforeSheet = latestSheet.copyTo(spreadsheet);
  new_beforeSheet.setName('before_followers');
}
