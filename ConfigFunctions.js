function loadConfigManagement() {
  var html = HtmlService.createHtmlOutputFromFile('configSidebar.html').setTitle('CONFIG Management')
  SpreadsheetApp.getUi().showSidebar(html)
}

function getMyIdAndConfig() {
  const myId = SpreadsheetApp.getActiveSpreadsheet().getId()
  const config = getConfigDetails()
  return { myId, config }
}

function getConfigDetails() {
  const CONFIG = wbLib.getCONFIG('AA_')
  return CONFIG
}

function changeSheetId(req) {
  console.log('Ready to change', req)
  const ssId = SpreadsheetApp.getActiveSpreadsheet().getId()
  const oldConfig = getConfigDetails()
  const newConfig = { ...oldConfig, COURSE_SHEET_ID: ssId }
  wbLib.replaceCONFIG(newConfig, (fileName = 'AA_'))
}

function unsetSheetId() {
  const oldConfig = getConfigDetails()
  const newConfig = { ...oldConfig, COURSE_SHEET_ID: 'unset' }
  wbLib.replaceCONFIG(newConfig, (fileName = 'AA_'))
}
