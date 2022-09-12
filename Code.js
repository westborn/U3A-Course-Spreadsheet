/**
 *
 * Version 5.2022.4 - Move to a single code base, managed in github
 *
 * Refactor to use westborn library (wbLib) of common functions
 * Refactor changes for using a standalone webapp for enrolment and not using google forms
 *
 */

/**
 *
 *
 * GLOBAL constants for U3A
 * Change these to match the column names you are using for email
 * recepient addresses and email sent column.
 */
var U3A = {
  // file is - "U3A Current Program - Wordpress"
  WORDPRESS_PROGRAM_FILE_ID: '1svCAoJKW7FsnerJSPhLkzuXEcicdksA5fcV2UfaztR8',

  // file is - "Term-3 Enrolments"
  ENROLMENT_GOOGLE_FORM_ID: '1plXH296qqV72yV92Zr5S7J6CIyxwqpdy-tZAsisIlTo',
  // file is - "Term-2 Enrolments"
  // ENROLMENT_GOOGLE_FORM_ID: '195xFDf-YBu7aLYa7lRbBf2V3VvSrm8WWLcFINT3lfIQ',
  // file is - "Term-1 Enrolments"
  // ENROLMENT_GOOGLE_FORM_ID: '1ALDrXrF5t9BLidEoIXSmqHM79iTRERUB4guQxO2jBko',
}

/**
 * Creates the menu items for user to run scripts on drop-down.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi()
  ui.createMenu('U3A Menu')
    .addSubMenu(ui.createMenu('CourseDetails').addItem('Change Course Status', 'loadCourseStatusSidebar'))
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('CalendarImport')
        .addItem('Schedule Zoom Meeting', 'selectedZoomSessions')
        .addItem('Email Session Advice', 'createSessionAdviceEmail')
        .addItem('Import Calendar', 'loadCalendarSidebar')
        .addItem('Create CourseDetails', 'createCourseDetails')
    )
    .addSeparator()
    .addItem('Email Registration Info to SELECTED Members', 'selectedHTMLRegistrationEmails')
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('Database')
        .addItem('Email ALL Enrollees - HTML', 'allHTMLRegistrationEmails')
        .addItem('Email SELECTED Enrollees - PDF', 'selectedRegistrationEmails')
        .addItem('Email SELECTED Enrollees - HTML', 'selectedHTMLRegistrationEmails')
        .addItem('Create Database from OnlineEnrolments', 'buildDB')
    )
    .addSeparator()
    .addSubMenu(ui.createMenu('Wordpress Actions').addItem('Create Course Program', 'makeCourseDetailForWordPress'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Other Actions').addItem('I&R Enrolment Sheet', 'selectedAttendanceRegister'))
    .addSeparator()
    .addItem('Help', 'loadHelpSidebar')
    .addToUi()
}

/**
 * Handler  to load Calendar Sidebar.
 */
function loadCalendarSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('calendarSidebar').setTitle('U3A Tools')
  SpreadsheetApp.getUi().showSidebar(html)
}

/**
 * Handler  to load Help Sidebar.
 */
function loadHelpSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('HelpSidebar').setTitle('U3A Tools Help')
  SpreadsheetApp.getUi().showSidebar(html)
}

/**
 * Handler  to load Help Sidebar.
 */
function loadCourseStatusSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('courseStatusSidebar').setTitle('U3A Tools')
  SpreadsheetApp.getUi().showSidebar(html)
}

function btn_makeHyperlink() {
  makeHyperlink()
}

function btn_print_attendance() {
  print_attendance()
}

function btn_createDraftZoomEmail() {
  createDraftZoomEmail()
}

function btn_print_courseRegister() {
  print_courseRegister()
}

function changeCourseStatus({ courseTitle, status }) {
  console.log('changeCourseStatus', courseTitle, status)
  updateCourseStatus(courseTitle, status)
  wbLib.showToast(`Updated "${courseTitle}" to ${status}`, 5)
}

function getCalendarList() {
  return wbLib.getCalendarList()
}
