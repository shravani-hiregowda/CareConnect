export default {
  isEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  },

  isPhone(phone) {
    return /^[0-9]{10,15}$/.test(phone);
  },

  isValidId(id) {
    return /^[A-Z]{1,4}-\d{4}-\d{3,5}$/.test(id);
  },

  isNonEmpty(str) {
    return typeof str === "string" && str.trim().length > 0;
  },

  validateRequiredFields(data, fields) {
    const missing = [];

    fields.forEach((field) => {
      if (!data[field] || data[field].toString().trim() === "") {
        missing.push(field);
      }
    });

    return {
      valid: missing.length === 0,
      missing
    };
  }
};
