import Report from "../models/Report.js";
import { extractPDFText } from "../services/pdfService.js";

// ---------------------------------- GET ALL REPORTS ----------------------------------
export const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ patientId: req.user.id });
    res.json(reports);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------- UPLOAD REPORT ----------------------------------
export const uploadReport = async (req, res, next) => {
  try {
    const { fileUrl, title, description, doctorName } = req.body;
    if (!fileUrl) return res.status(400).json({ message: "fileUrl required" });

    // 1) Extract text (pdf-parse + OCR fallback)
    const extractedText = await extractPDFText(fileUrl);


    // 2) Call AI extractor -> structured JSON
    const structured = await callAIExtractorService(extractedText);

    // 3) Save report with both raw text and structured JSON
    const report = await Report.create({
      patientId: req.user.id,
      title,
      description,
      doctorName,
      fileUrl,
      extractedText,
      extractedData: structured  // new field (store the JSON)
    });

    // 4) Return both for frontend auto-fill
    res.status(201).json({ report, extractedData: structured });
  } catch (err) {
    next(err);
  }
};
// ---------------------------------- GET SINGLE REPORT ----------------------------------
export const getReportDetails = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------- DELETE REPORT ----------------------------------
export const deleteReport = async (req, res, next) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: "Report deleted" });
  } catch (err) {
    next(err);
  }
};
