const analyticsService = require("../services/analyticsService");
const { httpError } = require("../utils/httpError");

const VALID_PERIODS = new Set(["7d", "30d", "90d", "1y", "all"]);

const PERIOD_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateRange(query) {
  const { period, startDate, endDate } = query;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endStr = toDateString(tomorrow);

  if (period) {
    if (!VALID_PERIODS.has(period)) {
      return { error: true };
    }
    if (period === "all") {
      return { startDate: "2000-01-01", endDate: endStr };
    }
    const daysAgo = PERIOD_DAYS[period];
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    return { startDate: toDateString(start), endDate: endStr };
  }

  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s >= e) {
      return { error: true };
    }
    return { startDate: toDateString(s), endDate: toDateString(e) };
  }

  // Default: last 30 days
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { startDate: toDateString(start), endDate: endStr };
}

exports.getSummary = async (req, res, next) => {
  try {
    const range = parseDateRange(req.query);
    if (range.error) {
      return next(httpError(400, "Invalid date range or period", "INVALID_QUERY"));
    }

    const result = await analyticsService.getPlantAnalytics(range.startDate, range.endDate);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
};
