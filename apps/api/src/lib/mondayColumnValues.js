/**
 * Maps between Greenery work_reqs rows and Monday.com column value objects.
 * Column IDs sourced from .agents/monday-board-map.md — do not change without
 * re-running scripts/monday-introspect.js to verify.
 */

// Greenery field → { columnId, mondayType }
const FIELD_MAP = {
  requestDate:    { columnId: "date_mm2aq9wj",      type: "date" },
  techName:       { columnId: "text_mm2amsvb",       type: "text" },
  account:        { columnId: "text_mm2ahm04",       type: "text" },
  accountContact: { columnId: "text_mm2afc5",        type: "text" },
  accountAddress: { columnId: "long_text_mm2aqvxj",  type: "long_text" },
  actionRequired: { columnId: "long_text_mm2a1ckm",  type: "long_text" },
  numberOfPlants: { columnId: "numeric_mm2aqtnt",    type: "numbers" },
  plantWanted:    { columnId: "text_mm2asd86",       type: "text" },
  plantReplaced:  { columnId: "text_mm2ah91n",       type: "text" },
  plantSize:      { columnId: "text_mm2adb9d",       type: "text" },
  plantHeight:    { columnId: "text_mm2ac5mt",       type: "text" },
  planterTypeSize:{ columnId: "text_mm2ad3h0",       type: "text" },
  planterColour:  { columnId: "text_mm2av6h7",       type: "text" },
  stagingMaterial:{ columnId: "text_mm2ansvp",       type: "text" },
  lighting:       { columnId: "text_mm2abm4d",       type: "text" },
  method:         { columnId: "long_text_mm2azyfd",  type: "long_text" },
  location:       { columnId: "text_mm2ah7qz",       type: "text" },
  notes:          { columnId: "long_text_mm2ajdep",  type: "long_text" },
  dueDate:        { columnId: "date4",               type: "date" },
  status:         { columnId: "text_mm2ae3s9",       type: "text" },
};

// Reverse lookup: Monday columnId → Greenery field name
const COLUMN_TO_FIELD = {};
for (const [field, { columnId }] of Object.entries(FIELD_MAP)) {
  COLUMN_TO_FIELD[columnId] = field;
}

function formatDate(val) {
  if (!val) return null;
  // Handle Date objects and ISO strings
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Convert a Greenery work_reqs row to Monday column_values object.
 * The returned object is suitable for JSON.stringify() in a mutation.
 */
function toMondayColumnValues(workReq) {
  const cv = {};

  for (const [field, { columnId, type }] of Object.entries(FIELD_MAP)) {
    const val = workReq[field];
    if (val === undefined || val === null) continue;

    switch (type) {
      case "text":
        cv[columnId] = String(val);
        break;
      case "long_text":
        cv[columnId] = { text: String(val) };
        break;
      case "numbers":
        cv[columnId] = String(Number(val));
        break;
      case "date": {
        const dateStr = formatDate(val);
        if (dateStr) cv[columnId] = { date: dateStr };
        break;
      }
    }
  }

  return cv;
}

/**
 * Convert Monday column_values array (from item query) back to Greenery fields.
 * Monday returns: [{ id: "text_mm2ahm04", text: "...", value: "..." }, ...]
 */
function fromMondayColumnValues(columnValues) {
  const result = {};

  for (const col of columnValues) {
    const field = COLUMN_TO_FIELD[col.id];
    if (!field) continue;

    const { type } = FIELD_MAP[field];

    switch (type) {
      case "text":
      case "long_text":
        result[field] = col.text || null;
        break;
      case "numbers":
        result[field] = col.text ? Number(col.text) : null;
        break;
      case "date":
        result[field] = col.text || null;
        break;
    }
  }

  return result;
}

/**
 * Extract relevant data from a Monday webhook event body.
 * Returns { mondayItemId, columnId, field, value } or null if unmapped.
 */
function fromWebhookPayload(event) {
  const mondayItemId = String(event.pulseId || event.itemId || "");
  const columnId = event.columnId;
  const value = event.value;

  if (!mondayItemId) return null;

  // For delete events there's no column change
  if (!columnId) {
    return { mondayItemId, columnId: null, field: null, value: null };
  }

  const field = COLUMN_TO_FIELD[columnId];
  if (!field) return null;

  return { mondayItemId, columnId, field, value };
}

module.exports = {
  FIELD_MAP,
  COLUMN_TO_FIELD,
  toMondayColumnValues,
  fromMondayColumnValues,
  fromWebhookPayload,
};
