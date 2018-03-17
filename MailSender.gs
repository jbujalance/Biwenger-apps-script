function MailSender (data) {
  this.data = data
}

MailSender.prototype.sendMails = function () {
  MailApp.sendEmail(this._buildEmailMessage());
  Logger.log("Remaining email quota: " + MailApp.getRemainingDailyQuota());
}

MailSender.prototype._buildEmailMessage = function () {
  var message = {
    name: "Tulliditos",
    subject: "Resumen jornada " + this.data.round,
    to: this._getRecipients(),
    htmlBody: this._buildMessageBody(),
    noReply: true
  };
  return message;
}

MailSender.prototype._buildMessageBody = function () {
  var template = HtmlService.createTemplateFromFile('messageBody');
  template.data = this.data;
  return template.evaluate().getContent();
}

MailSender.prototype._getRecipients = function () {
  var addresses = SpreadsheetApp.getActiveSheet().getRange(23, 15, 9).getValues();
  var filtered = addresses.filter(function (item) {
    return item[0] !== "";
  });
  return filtered.join();
}
