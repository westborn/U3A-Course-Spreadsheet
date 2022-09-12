/**
 * Find the presenters email - if we have one.
 * @param {*} presenterName
 * @returns presenter sheet object (or undefined)
 */
function getPresenter(presenterName) {
  //get presenterDetail sheet
  const presenterData = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('PresenterDetails')
    .getDataRange()
    .getValues()
  const allPresenters = getJsonArrayFromData(presenterData)
  return allPresenters.find((presenter) => presenter.name === presenterName)
}
/**
 * Get the attendees from the sheet and populate a hyperlink with mailto: bcc items
 * 2 Hyperlinks are coonstructed 1 for Outlook (with ; delimiter) and one for Mac (with , delimiter)
 */
function makeHyperlink() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('Attendance')

  var emailData = sheet.getRange('E14:E60').getValues()
  //flatten array and remove dups and drop empty strings
  var noDups = [...new Set(emailData.flat())].filter(String)
  //  Logger.log(noDups)
  //  Logger.log(noDups.length)
  sheet.getRange('C5:C6').clearContent()

  var hyperValOutlook = `=HYPERLINK("mailto:noreply@gmail.com?bcc=${noDups.join(';')}","Outlook Link")`
  var hyperValMac = `=HYPERLINK("mailto:noreply@gmail.com?bcc=${noDups.join(',')}","MacMail Link")`

  sheet.getRange('C5').setValue(hyperValOutlook)
  sheet.getRange('C5').setShowHyperlink(true)

  sheet.getRange('C6').setValue(hyperValMac)
  sheet.getRange('C6').setShowHyperlink(true)
}

/**
 * Write a print area to a PDF for Attendance data on the sheet
 * "O3" for the recipient
 * "D10" for presenter
 * "D8" for course
 */
function print_attendance() {
  makeHyperlink()
  var rangeNameToPrint = 'print_area_attendance'

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  var myNamedRanges = listNamedRangesA1(spreadsheet)
  console.log(myNamedRanges)
  if (myNamedRanges[rangeNameToPrint] === 'undefined') {
    showToast("No print area found. Please define one 'print_area_????' named range using Data > Named ranges.", 30)
    return
  }
  var selectedRange = spreadsheet.getRangeByName(myNamedRanges[rangeNameToPrint])
  console.log(selectedRange)
  var sheetToExport = selectedRange.getSheet()
  var presenterName = sheetToExport.getRange('D10').getDisplayValue()
  var courseTitle = sheetToExport.getRange('D8').getDisplayValue()
  var fileName = presenterName + '-' + courseTitle + '.pdf'

  var pdfFile = makePDFfromRange(selectedRange, fileName, 'Attendance Sheets')

  var recipientEmail = sheetToExport.getRange('O3').getDisplayValue()
  const thisPresenter = getPresenter(sheetToExport.getRange('M3').getDisplayValue())
  const presenterEmail = thisPresenter ? thisPresenter.email : ''
  var recipient = recipientEmail === presenterEmail ? recipientEmail : `${recipientEmail}; ${presenterEmail}`

  var subject = courseTitle + ' - Attendance Sheet'
  var body =
    '\n\nAttached is the registration sheet for the course.\n\nPlease let us know if there are any changes required.\n\n\nU3A Team'

  var resp = GmailApp.createDraft(recipient, subject, body, {
    attachments: [pdfFile.getAs(MimeType.PDF)],
    name: 'Bermagui U3A',
  })

  return
}

/**
 * Write a print area to a PDF for Course data on the sheet
 * "K4" for the recipient name
 * "K2" for the recipient email
 * "B3" for Salutation (like "Hi George")
 */
function print_courseRegister() {
  var rangeNameToPrint = 'print_area_courseRegister'

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  var myNamedRanges = listNamedRangesA1(spreadsheet)
  if (myNamedRanges[rangeNameToPrint] === 'undefined') {
    showToast("No print area found. Please define one 'print_area_????' named range using Data > Named ranges.", 30)
    return
  }
  var selectedRange = spreadsheet.getRangeByName(myNamedRanges[rangeNameToPrint])
  var sheetToExport = selectedRange.getSheet()
  var memberName = sheetToExport.getRange('K4').getDisplayValue()
  var fileName = memberName + ' - Enrolment Information.pdf'

  var pdfFile = makePDFfromRange(selectedRange, fileName, 'Enrolment Information')

  var recipient = sheetToExport.getRange('K2').getDisplayValue()
  var subject = sheetToExport.getRange('K3').getDisplayValue()
  var body =
    sheetToExport.getRange('B3').getDisplayValue() +
    '\n\nYour registration details for this term are listed on the attached PDF.\n\nPlease let us know if there are any changes required.\n\n\nU3A Team'

  var resp = GmailApp.createDraft(recipient, subject, body, {
    attachments: [pdfFile.getAs(MimeType.PDF)],
    name: 'Bermagui U3A',
  })

  return
}

/**
 * Create a formatted sheet that is displayed natively by WordPress
 * the WordPress sheet is pre-existing and the ID is a global reference
 * the data comes from the "CourseDetails" sheet
 *
 */
function makeCourseDetailForWordPress() {
  //get courseDetail sheet
  const courseData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CourseDetails').getDataRange().getValues()
  const allCourses = getJsonArrayFromData(courseData)

  var ssDest = SpreadsheetApp.openById(U3A.WORDPRESS_PROGRAM_FILE_ID)

  var sheet = ssDest.getSheetByName('Web Program')
  maxRows = sheet.getMaxRows()
  if (maxRows > 1) {
    sheet.deleteRows(2, maxRows - 1)
  }
  sheet.insertRowsAfter(1, allCourses.length - 1)

  allCourses.forEach((course, index) => {
    //Loop through each row
    var outputStart = sheet.getRange(index + 1, 1)
    courseDetailToSheet(course, outputStart)
  })
}

/**
 * Create a formatted row from the CourseDetails sheet
 * @param {object} course row from CourseDetails
 * @param {range} outputTo range to write to on the sheet
 *
 * currently uses ordinal positions of the columns
 */
function courseDetailToSheet(course, outputTo) {
  var bold = SpreadsheetApp.newTextStyle().setBold(true).build()
  var defaultFontSize = SpreadsheetApp.newTextStyle().setFontSize(12).build()
  var bodyFontSize = SpreadsheetApp.newTextStyle().setFontSize(11).build()
  var headColor = SpreadsheetApp.newTextStyle().setForegroundColor('#ff9900').build()
  var headFontSize = SpreadsheetApp.newTextStyle().setFontSize(14).build()

  let rich
  let cell

  cell = course.summary + '\n' + course.description
  var headLen = course.summary.length
  rich = SpreadsheetApp.newRichTextValue()
  rich
    .setText(cell)
    .setTextStyle(bodyFontSize)
    .setTextStyle(0, headLen, headColor)
    .setTextStyle(0, headLen, headFontSize)
  outputTo
    .setRichTextValue(rich.build())
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment('middle')

  cell = course.dates + '\n' + course.time + '\n' + course.location + '\n' + course.phone
  rich = SpreadsheetApp.newRichTextValue()
  rich.setText(cell).setTextStyle(defaultFontSize)
  outputTo
    .offset(0, 1)
    .setRichTextValue(rich.build())
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment('middle')

  // Calculate 2 friday's prior to course start date.

  // const prevFridayDate = new Date(getPreviousFridayTimestamp(course.startDate))
  // const twoWeeksAgoFriday = new Date(prevFridayDate.setDate(prevFridayDate.getDate() - 7))

  cell =
    'Enrolments close - ' +
    fmtDateTimeLocal(new Date(course.closeDate), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  rich = SpreadsheetApp.newRichTextValue()
  rich.setText(cell).setTextStyle(bodyFontSize).setLinkUrl('https://U3ABermagui.com.au/enrolment')
  outputTo
    .offset(0, 2)
    .setRichTextValue(rich.build())
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment('middle')

  outputTo.offset(0, 0, 1, 3).setBorder(true, null, null, null, null, null, 'black', SpreadsheetApp.BorderStyle.SOLID)
}

/**
 * simple loop to call "print_courseRegister" for selected rows in the database
 */
function selectedRegistrationEmails() {
  // Selection must be memberName(s)
  const res = metaSelected(1)
  if (!res) {
    return
  }
  const pdfSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Course Registration')

  const { sheetSelected, rangeSelected } = res
  let attendees = sheetSelected.getRange(rangeSelected).getDisplayValues()
  attendees.forEach((attendee) => {
    //push the name into the PDF sheet
    pdfSheet.getRange('K1').setValue(attendee[0])
    print_courseRegister()
  })
}

/**
 * Create an email to all attendees of a course and include Zoom session details
 * NOTE: Uses an existing DRAFT email as a template
 * NOTE: This is used a few days prior to a session to send a link
 *       to all the enrolled participants
 *
 */
function createSessionAdviceEmail() {
  // Must select Summary(column1) and just one column
  const res = metaSelected(1, 'CalendarImport')
  if (!res) {
    return
  }
  const { rowSelected, numRowsSelected } = res

  //get CalendarImport sheet
  const sessionData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CalendarImport').getDataRange().getValues()
  const allSessions = getJsonArrayFromData(sessionData)

  //filter to just the session selected. Note header and zero based index means offset -2
  selectedSessions = allSessions.filter(
    (session_, idx) => idx >= rowSelected - 2 && idx < rowSelected + numRowsSelected - 2
  )
  // selectedSessions.map((el) => console.log(el.summary, el.id))

  //get courseDetail sheet
  const courseData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CourseDetails').getDataRange().getValues()
  const allCourses = getJsonArrayFromData(courseData)
  //get memberDetail sheet
  const memberData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MemberDetails').getDataRange().getValues()
  const allMembers = getJsonArrayFromData(memberData)
  //get the Database of who is attending which course (columns B:C)
  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Database')
  const dbData = db.getRange('B12:C' + db.getLastRow()).getValues()
  const allDB = getJsonArrayFromData(dbData)

  selectedSessions.forEach((thisSession) => {
    const courseDateTime = formatU3ADateTime(new Date(thisSession.startDateTime))

    const thisCourse = allCourses.find(
      // (course) => course.summary.toString().toLowerCase() === thisSession.summary.toString().toLowerCase() Stop DUPs
      (course) => course.summary.toString() === thisSession.summary.toString()
    )
    const recipientEmail = thisCourse.email
    const thisPresenter = getPresenter(thisCourse.presenter)
    const presenterEmail = thisPresenter ? thisPresenter.email : ''
    const recipient = recipientEmail === presenterEmail ? recipientEmail : `${recipientEmail}; ${presenterEmail}`

    // now do contact details
    const contactName = thisCourse.contact
    const contactEmail = thisCourse.email
    let contactString = `<a href="mailto:${contactEmail},david@u3abermagui.com.au">${contactName}</a>`
    if (thisPresenter && recipientEmail != presenterEmail) {
      contactString += ` OR <a href="mailto:${presenterEmail},david@u3abermagui.com.au">${thisCourse.presenter}</a>`
    }

    let subject = 'U3A: ' + thisSession.summary + '  -  ' + courseDateTime

    const membersGoing = allDB
      .filter((dbEntry) => dbEntry.goingTo.toString().toLowerCase() === thisCourse.title.toString().toLowerCase())
      .map((entry) => entry.memberName)
    const memberEmails = membersGoing.map(
      (name) =>
        allMembers.find((member) => name.toString().toLowerCase() === member.memberName.toString().toLowerCase()).email
    )
    //flatten array and remove dups and drop empty strings
    const bccEmails = [...new Set(memberEmails.flat())].filter(String).join(',')

    const fieldReplacer = {
      courseSummary: thisSession.summary,
      startDateTime: courseDateTime,
      courseLocation: thisSession.location,
      contact: contactString,
    }

    let templateEmailSubject = 'TEMPLATE - U3A Class Advice'
    if (thisSession.location.toLowerCase().includes('zoom')) {
      templateEmailSubject = 'TEMPLATE - Zoom Class Advice'
    }
    if (thisCourse.courseStatus === 'Cancelled') {
      templateEmailSubject = 'TEMPLATE - U3A Class Cancelled'
      subject = 'U3A: SESSION CANCELLED - ' + thisSession.summary
    }

    // get the draft Gmail message to use as a template
    const emailTemplate = getGmailTemplateFromDrafts_(templateEmailSubject)

    try {
      const msgObj = fillinTemplateFromObject(emailTemplate.message, fieldReplacer)
      const msgText = stripHTML(msgObj.text)
      GmailApp.createDraft(recipient, subject, msgText, {
        htmlBody: msgObj.html,
        bcc: bccEmails,
        name: 'Bermagui U3A',
        attachments: emailTemplate.attachments,
      })
    } catch (e) {
      throw new Error("Oops - can't create new Gmail draft")
    }
  })
}

/**
 * Formats a date to a "standard" for U3A correspondence
 * "ddd d-mmm h:mm AM"
 * @param {date} dte
 * @returns {string} formatted date and time string
 */
function formatU3ADateTime(dte) {
  const config = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }
  const dateTimeFormat = new Intl.DateTimeFormat('en-AU', config)

  const [
    { value: weekday },
    ,
    { value: day },
    ,
    { value: month },
    ,
    { value: year },
    ,
    { value: hour },
    ,
    { value: minute },
    ,
    { value: second },
    ,
    { value: dayperiod },
  ] = dateTimeFormat.formatToParts(new Date(dte))

  return `${weekday} ${day}-${month} ${hour}:${minute}${dayperiod}`
}

/**
 * Formats a date to a "standard" for U3A correspondence
 * "ddd d-mmm"
 * @param {date} dte
 * @returns {string} formatted date string
 */
function formatU3ADate(dte) {
  const config = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
  }
  const dateTimeFormat = new Intl.DateTimeFormat('en-AU', config)

  const [{ value: weekday }, , { value: day }, , { value: month }, , { value: year }, , { value: hour }] =
    dateTimeFormat.formatToParts(new Date(dte))

  return `${weekday} ${day}-${month}`
}

/**
 * Reformats CalendarImport and creates the CourseDetails sheet - 1 row per course.
 *
 */
function createCourseDetails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  const courseDetailsSheet = ss.getSheetByName('CourseDetails')
  //clear the sheet we are going to create
  courseDetailsSheet.insertRowBefore(2)
  const lastRow = courseDetailsSheet.getLastRow()
  if (lastRow > 2) {
    courseDetailsSheet.deleteRows(3, lastRow - 2)
  }

  //get memberDetail sheet
  const memberData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MemberDetails').getDataRange().getValues()
  const allMembers = getJsonArrayFromData(memberData)

  //get CalendarImport sheet and sort it by summary and startDate
  const sessionData = ss.getSheetByName('CalendarImport').getDataRange().getValues()
  const allSessions = getJsonArrayFromData(sessionData)
  const sortedSessions = allSessions.sort((a, b) => {
    if (a.summary !== b.summary) {
      return a.summary < b.summary ? -1 : 1
    }
    const datediff = new Date(a.startDateTime) - new Date(b.startDateTime)
    if (datediff != 0) {
      return datediff
    }
    return 0
  })

  //get unique session summary and index to the session with the earliest date for that summary
  const courses = sortedSessions.reduce((acc, { summary, startDateTime }, index, src) => {
    if (!acc.hasOwnProperty(summary)) {
      acc[summary] = index
      return acc
    }
    if (src[acc[summary]].startDateTime > startDateTime) {
      acc[summary] = index
      return acc
    }
    return acc
  }, {})

  // Search for a string and return the next word
  let getWordAfter = (str, searchText) => {
    const re = new RegExp(`${searchText}\\s(\\S+)`, 'i')
    const found = str.match(re)
    return found && found.index ? found[1] : ''
  }

  const rows = Object.values(courses).map((index) => {
    // Title
    const foundWithInTitle = sortedSessions[index].summary.match(/with(?!.*with)/i)
    const title =
      foundWithInTitle && foundWithInTitle.index
        ? sortedSessions[index].summary.slice(0, foundWithInTitle.index).trim()
        : sortedSessions[index].summary

    // Dates
    const startDateTime = new Date(sortedSessions[index].startDateTime)
    const startDate = googleSheetDateTime(startDateTime)

    const endDateTime = new Date(sortedSessions[index].endDateTime)

    const closeDate = new Date(getPreviousFridayTimestamp(startDateTime))
    //Used to be 2 weeks prior - code here just incase we revert
    // const closeDate = new Date(prevFridayDate.setDate(prevFridayDate.getDate() - 7))

    // Times
    const displayStartTime = fmtDateTimeLocal(startDateTime, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const displayEndTime = fmtDateTimeLocal(endDateTime, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const time = `${displayStartTime} - ${displayEndTime}`.replace(/:00 /g, '')

    const member =
      allMembers.find(
        (member) =>
          sortedSessions[index].contact.toString().toLowerCase() === member.memberName.toString().toLowerCase()
      ) || {}

    // Check to see if "Cost:" is in description and get the amount - else Zero
    let cost = getWordAfter(sortedSessions[index].description, 'Cost:')
    var regex = /[+-]?\d+(\.\d+)?/g
    if (cost && cost.match(regex) != null) {
      var floats = cost.match(regex).map(function (v) {
        return parseFloat(v)
      })
      cost = floats
    } else {
      cost = 0
    }

    const days = sortedSessions[index].daysScheduled
    const dates = sortedSessions[index].datesScheduled

    const numberOfSessions = (dates.match(/,/g) || []).length + 1
    const courseCost = cost * numberOfSessions

    return {
      summary: sortedSessions[index].summary,
      title,
      startDate,
      closeDate,
      presenter: sortedSessions[index].presenter,
      days,
      dates,
      time,
      location: sortedSessions[index].location || 'Zoom online',
      description: sortedSessions[index].description,
      min: getWordAfter(sortedSessions[index].description, 'Min:'),
      max: getWordAfter(sortedSessions[index].description, 'Max:'),
      cost,
      courseCost,
      phone: member.mobile || '',
      email: member.email || '',
      contact: sortedSessions[index].contact || 'No Contact',
      numberCurrentlyEnroled: '0',
      courseStatus: 'Enrol?',
    }
  })

  const heads = courseDetailsSheet.getDataRange().offset(0, 0, 1).getValues()[0]

  // convert object data into a 2d array
  const tr = rows.map((row) => heads.map((key) => row[String(key)] || ''))

  // write result
  courseDetailsSheet.getRange(courseDetailsSheet.getLastRow() + 1, 1, tr.length, tr[0].length).setValues(tr)

  return
}

/**
 * Update existing Google Form with details of all courses in "CourseDetails" sheet
 *
 */
function updateWordpressEnrolmentForm() {
  //find the existing Google Form
  const googleForm = FormApp.openById(U3A.ENROLMENT_GOOGLE_FORM_ID)
  // const googleForm = FormApp.openById('1oTkGQNzNHn3cDKkU5ez0_c1vM4Y4zr1GS4CUHgzUGDE')

  // get the response spreadsheet ID, folder and filename
  const responseSpreadsheetId = googleForm.getDestinationId()
  const responseFolder = DriveApp.getFileById(responseSpreadsheetId).getParents().next()
  const responseFilename = DriveApp.getFileById(responseSpreadsheetId).getName()

  // Disconnect the response spreadsheet from its form
  googleForm.removeDestination()

  // delete all existing CheckBox Questions ready to add all courses
  var items = googleForm.getItems()
  items.forEach((item) => {
    if (item.getType() == 'CHECKBOX') {
      // console.log('Deleting... ', item.getTitle())
      googleForm.deleteItem(item)
    }
  })

  //get courseDetail sheet
  const courseData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CourseDetails').getDataRange().getValues()
  const allCourses = getJsonArrayFromData(courseData)

  // add each course to the form
  /**
   * TODO
   * what other text needs to be in the helptext?
   * update when close date reached or count >= max (IF MAX > 0)
   *
   *
   */
  allCourses.forEach((thisCourse) => {
    const courseTitle = thisCourse.title != '' ? thisCourse.title : thisCourse.summary
    const courseDateTime = formatU3ADateTime(new Date(thisCourse.startDate))
    const closeDate = formatU3ADate(new Date(thisCourse.closeDate))
    const courseStatus = thisCourse.courseStatus

    var courseHelpText = ''
    switch (courseStatus) {
      case 'Enrol?':
        courseHelpText = `Course commences: ${courseDateTime}`
        courseHelpText += `\n${thisCourse.location}`
        courseHelpText += thisCourse.closeDate !== '' ? `\nEnrolments close: ${closeDate}` : ''
        break
      case 'Waitlist?':
        courseHelpText = `Course is fully booked - you can wait list and we'll notify you if a vacancy happens`
        break
      case 'Closed!':
        courseHelpText = `Course is now closed - no additional registrations can be accepted`
        break
      case 'Cancelled':
        courseHelpText = `Course has been cancelled - no registrations can be accepted`
        break
      default:
        courseHelpText = `Course is now closed! - no additional registrations can be accepted`
    }

    const item = googleForm.addCheckboxItem().setTitle(courseTitle).setHelpText(courseHelpText)
    const choice = item.createChoice(courseStatus)
    item.setChoices([choice])
    showToast(`Processed: ${thisCourse.title} as ${courseStatus}`, 1)
  })

  //make a new filename with todays date/time
  const newResponseFilename = `${responseFilename} (Archive - ${formatU3ADateTime(Date.now())})`
  //copy the existing response sheet to an archive copy
  DriveApp.getFileById(responseSpreadsheetId).makeCopy(newResponseFilename, responseFolder)

  // remove all existing responses from the form
  googleForm.deleteAllResponses()

  //set up existing sheet to take responses again
  googleForm.setDestination(FormApp.DestinationType.SPREADSHEET, responseSpreadsheetId)
}

/**
 * Take the contents of a form's responses and write the transformed values to the "CSV" sheet
 *
 * @param {sheet Object} responseSheet from the spreadsheet attached to the form
 */
function enrolResponseToCSV(responseSheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('CSV')

  //get courseDetail sheet
  const courseData = ss.getSheetByName('CourseDetails').getDataRange().getValues()
  const allCourses = getJsonArrayFromData(courseData)
  //get just the title from  the Course Details sheet and sort alphabetically
  const courseTitles = allCourses.map((course) => course.title).sort()
  const numberOfCourses = courseTitles.length

  //get the response data from spreadsheet attached to the enrolment form
  const responseData = responseSheet.getDataRange().getValues()
  const allResponses = getJsonArrayFromData(responseData)

  //reduce the Form Response data to an array of ["name", "email", [course titles enroled in]]
  const registrationItems = allResponses.reduce((acc, resp) => {
    //get the column name keys from the response line
    const cols = Object.keys(resp)
    // ignore column names that aren't course titles
    // include columns that have enrol? checked
    const courses = cols.filter((col) => {
      if (!col.match(/^(Timestamp|Name|Email address)$/) && resp[col] === 'Enrol?') {
        return true
      }
    })
    //if there are any courses add them to our result
    if (courses) {
      acc.push([resp['Name'], resp['Email address'], courses])
    }
    return acc
  }, [])

  // clear the CSV sheet and write the headings
  sheet.clear()
  sheet.appendRow(['name', 'email', ...courseTitles, 'nameCheck', 'emailCheck'])

  //format course columns with diagonal headings and narrow width
  sheet.setColumnWidth(1, 150)
  sheet.setColumnWidth(2, 150)
  courseTitles.forEach((_course, idx) => {
    sheet.setColumnWidth(idx + 3, 100)
    sheet.getRange(1, idx + 3).setTextRotation(60)
  })
  sheet.setColumnWidth(numberOfCourses + 3, 120)
  sheet.setColumnWidth(numberOfCourses + 4, 120)

  //loop thru form response rows
  //  then thru array of courses in the response
  //    output name, email, [each course]
  result = []
  registrationItems.forEach(([name, email, courses]) => {
    const thisRow = Array(numberOfCourses).fill('')
    courses.forEach((course) => {
      // get the column index of the enroled course
      enroledIndex = courseTitles.indexOf(course)
      if (enroledIndex > -1) {
        thisRow[enroledIndex] = '1'
      }
    })
    result.push([name.trim(), email.trim(), ...thisRow])
  })
  //Write the data back to the sheet
  if (result) {
    sheet.getRange(sheet.getLastRow() + 1, 1, result.length, result[0].length).setValues(result)

    //set a formula in the last 2 columns as error checking
    const formulas = [
      'ArrayFormula(index(Members,match(TRUE, exact(A2,memberName),0),1))',
      'ArrayFormula(index(Members,match(TRUE, exact(B2,memberEmail),0),1))',
    ]
    sheet.getRange(2, numberOfCourses + 3, 1, 2).setFormulas([formulas])
    const fillDownRange = sheet.getRange(2, numberOfCourses + 3, sheet.getLastRow() - 1)
    sheet.getRange(2, numberOfCourses + 3, 1, 2).copyTo(fillDownRange)
  }
}

/**
 * Look for a Google Form in the current folder
 * > 1 form file - ask user
 * no form files - throw error
 *
 * get the current response sheet
 * pass it to the function that decodes it and writes to 'CSV' sheet
 */
function makeEnrolmentCSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const ssFolder = getMyFolder(ss)
  const ssFolderName = ssFolder.getName()
  let formFileArray
  formFileArray = findFilesInFolder(ssFolder, "mimeType = 'application/vnd.google-apps.form'")

  if (formFileArray.length === 0) {
    throw new Error(`Can't find a Google Form in the "${ssFolderName}" folder`)
  }

  if (formFileArray.length > 1) {
    const formFileName = promptForFormName()
    if (formFileName) {
      const searchFor = `mimeType = 'application/vnd.google-apps.form' and title contains '${formFileName}'`
      formFileArray = findFilesInFolder(ssFolder, searchFor)
      if (formFileArray.length != 1) {
        throw new Error(`Can't find a Form '${formFileName}' in the "${ssFolderName}" folder`)
      }
    }
  }
  const formFileId = formFileArray[0].getId()
  const googleForm = FormApp.openById(formFileId)
  const formResponseSheet = getFormDestinationSheet(googleForm)

  enrolResponseToCSV(formResponseSheet)
  return
}

/**
 * Get data from the "CSV" and populate the "Database"
 * For all the columns that have a 1 - write the details to the database columns
 * Recalculate the 2 pivot tables after the database is written back to the sheet
 */
function buildDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  //get RegistrationMaster sheet
  const registrationData = ss.getSheetByName('RegistrationMaster').getDataRange().getValues()
  const allRegistrations = getJsonArrayFromData(registrationData)

  //reduce the registration data to an array of ["name", courseTitle"]
  const dbItems = allRegistrations.reduce((acc, resp) => {
    //get the column name keys from the response line
    const cols = Object.keys(resp)
    // ignore column names that aren't course titles
    // include columns that have "1" in the column
    const courses = cols.filter((col) => {
      if (!col.match(/^(name|email|count)$/) && resp[col] != '') {
        return true
      }
    })
    //if there are any courses add them to our database
    courses.map((course) => {
      acc.push([resp['name'], course])
    })
    return acc
  }, [])

  //clear 2 Database columns of ALL data
  dbSheet = ss.getSheetByName('Database')
  dbSheet.getRange('B13:C').clear()
  // write the 2 columns to the sheet - starting at "B13"
  dbSheet.getRange(13, 2, dbItems.length, 2).setValues(dbItems)

  //Now create the 2 pivot tables (E12 and H12) from the Database

  const sourceRange = 'B12:C' + (dbItems.length + 12).toString()
  const sourceData = dbSheet.getRange(sourceRange)

  const pivotTable1 = dbSheet.getRange('E12').createPivotTable(sourceData)
  const pivotValue1 = pivotTable1.addPivotValue(2, SpreadsheetApp.PivotTableSummarizeFunction.COUNTA)
  pivotValue1.setDisplayName('numberCourses')
  const pivotGroup1 = pivotTable1.addRowGroup(2)

  const pivotTable2 = dbSheet.getRange('I12').createPivotTable(sourceData)
  const pivotValue2 = pivotTable2.addPivotValue(3, SpreadsheetApp.PivotTableSummarizeFunction.COUNTA)
  pivotValue2.setDisplayName('numberAttendees')
  const pivotGroup2 = pivotTable2.addRowGroup(3)
}

/**
 * Update Google Form and "CourseDetails" sheet to reflect a new "courseStatus"
 *
 */
function updateCourseStatus(title, status) {
  //find the existing Google Form
  const googleForm = FormApp.openById(U3A.ENROLMENT_GOOGLE_FORM_ID)

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CourseDetails')
  const courseData = sheet.getDataRange().getValues()
  const allCourses = getJsonArrayFromData(courseData)

  thisCourse = allCourses.find((course) => course.title === title)
  const courseDateTime = formatU3ADateTime(new Date(thisCourse.startDate))
  const closeDate = formatU3ADate(new Date(thisCourse.closeDate))
  var courseHelpText = ''
  switch (status) {
    case 'Enrol?':
      courseHelpText = `Course commences: ${courseDateTime}`
      courseHelpText += `\n${thisCourse.location}`
      courseHelpText += thisCourse.closeDate !== '' ? `\nEnrolments close: ${closeDate}` : ''
      break
    case 'Waitlist?':
      courseHelpText = `Course is fully booked - you can wait list and we'll notify you if a vacancy happens`
      break
    case 'Closed!':
      courseHelpText = `Course is now closed - no additional registrations can be accepted`
      break
    case 'Cancelled':
      courseHelpText = `Course has been cancelled - no registrations can be accepted`
      break
    default:
      courseHelpText = `Course is now closed! - no additional registrations can be accepted`
  }

  const formItems = googleForm.getItems(FormApp.ItemType.CHECKBOX)
  for (const item of formItems) {
    if (item.getTitle() === title) {
      const checkboxItem = item.asCheckboxItem()
      checkboxItem.setHelpText(courseHelpText)
      checkboxItem.setChoices([checkboxItem.createChoice(status)])
    }
  }

  const titleRow = getRowFromColumnSearch(courseData, 'title', title)
  const columnNumber = courseData[0].indexOf('courseStatus')
  sheet.getRange(titleRow, columnNumber + 1, 1, 1).setValue(status)
}

/**
 * get a list of course titles from the CourseDetails sheet
 *
 */
function getCourseList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CourseDetails')
  const courseData = sheet.getDataRange().getValues()
  const allCourses = getJsonArrayFromData(courseData)

  const courseTitles = allCourses.map((course) => course.title)

  return courseTitles
}
