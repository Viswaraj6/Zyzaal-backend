
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "Sales_Report.xlsx");
const SHEET = "DailySummary";

async function updateExcel(data) {

    let workbook;
    let sheet;
    let rows = [];

    // File exists?
    if (fs.existsSync(FILE)) {

        workbook = XLSX.readFile(FILE);

        sheet = workbook.Sheets[SHEET];

        if (sheet) {
            rows = XLSX.utils.sheet_to_json(sheet);
        }

    } else {

        workbook = XLSX.utils.book_new();

    }

    // Find existing row (Date + Store)
    const index = rows.findIndex(r =>
        r.Date === data.date &&
        r.Store === data.store
    );

    if (index >= 0) {

        rows[index].Sales = data.sales;
        rows[index].Cash = data.cash;
        rows[index].Card = data.card;
        rows[index]["QR/UPI"] = data.qr;
        rows[index].Wallet = data.wallet;
        rows[index]["Credit Note"] = data.creditNote;
        rows[index]["Payment Received"] = data.paymentReceived;

    } else {

        rows.push({
            Date: data.date,
            Store: data.store,
            Sales: data.sales,
            Cash: data.cash,
            Card: data.card,
            "QR/UPI": data.qr,
            Wallet: data.wallet,
            "Credit Note": data.creditNote,
            "Payment Received": data.paymentReceived
        });

    }

    const newSheet = XLSX.utils.json_to_sheet(rows);

    workbook.Sheets[SHEET] = newSheet;

    if (!workbook.SheetNames.includes(SHEET)) {
        workbook.SheetNames.push(SHEET);
    }

    XLSX.writeFile(workbook, FILE);

    console.log("Excel Updated");

}

module.exports = {
    updateExcel
};
