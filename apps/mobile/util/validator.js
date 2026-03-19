export const validateReferenceNumnber = (req) => {
  if (!req || req.trim() === "") {
    return false;
  }
  return true;
};

export const validateNumberOfPlants = (num) => {
  if (!num || String(num).trim() === "") return false;
  if (isNaN(num) || Number(num) <= 0) return false;
  return true;
};

export const validateTechName = (name) => {
  if (!name || name.trim() === "") return false;
  const nameRegex = /^[a-zA-Z\s\-']{2,100}$/;
  if (!nameRegex.test(name.trim())) {
    return false;
  }
  return true;
};

export const validateAccount = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateAccountContact = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateAccountAddress = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateAddress = (address) => {
  if (!address || address.trim() === "") return false;
  const addressRegex =
    /^\d{1,6}\s+([\w\-.'#]+\s?)+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Way|Crescent|Circle|Cir|Terrace|Place|Pl|Trail|Trl|Parkway|Pkwy)\s*(N|S|E|W|NE|NW|SE|SW)?$/i;
  if (!addressRegex.test(address.trim())) {
    return false;
  }
  return true;
};

export const validateActionRequired = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validatePlantWanted = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validatePlantReplaced = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validatePlantSize = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validatePlantHeight = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validatePlanterTypeSize = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validatePlanterColour = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateStagingMaterial = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateLighting = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateMethod = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateLocation = (text) => {
  if (!text || text.trim() === "") return false;
  return true;
};

export const validateWorkRequest = (requestForm) => {
  if (!validateReferenceNumnber(requestForm.referenceNumber)) {
    return { result: false, message: "Please input valid referenceNumber!" };
  }
  if (!validateTechName(requestForm.techName)) {
    return { result: false, message: "Please input valid Tech Name!" };
  }
  if (!validateAccount(requestForm.account)) {
    return { result: false, message: "Please input valid account!" };
  }
  if (!validateAccountContact(requestForm.accountContact)) {
    return { result: false, message: "Please input valid account contact!" };
  }
  if (!validateAccountAddress(requestForm.accountAddress)) {
    return { result: false, message: "Please input valid account address!" };
  }
  if (!validateActionRequired(requestForm.actionRequired)) {
    return { result: false, message: "Please input valid action required!" };
  }
  if (!validateNumberOfPlants(requestForm.numberOfPlants)) {
    return { result: false, message: "Please input valid number of plants!" };
  }
  if (!validatePlantWanted(requestForm.plantWanted)) {
    return { result: false, message: "Please input valid plant wanted!" };
  }
  if (!validatePlantReplaced(requestForm.plantReplaced)) {
    return { result: false, message: "Please input valid plant replaced!" };
  }
  if (!validatePlantSize(requestForm.plantSize)) {
    return { result: false, message: "Please input valid plant size!" };
  }
  if (!validatePlantHeight(requestForm.plantHeight)) {
    return { result: false, message: "Please input valid plant height!" };
  }
  if (!validatePlanterTypeSize(requestForm.planterTypeSize)) {
    return { result: false, message: "Please input valid plant type size!" };
  }
  if (!validatePlanterColour(requestForm.planterColour)) {
    return { result: false, message: "Please input valid plant colour!" };
  }
  if (!validateStagingMaterial(requestForm.stagingMaterial)) {
    return { result: false, message: "Please input valid stagingMaterial!" };
  }
  if (!validateLighting(requestForm.lighting)) {
    return { result: false, message: "Please input valid lighting!" };
  }
  if (!validateMethod(requestForm.method)) {
    return { result: false, message: "Please input valid method!" };
  }
  if (!validateLocation(requestForm.location)) {
    return { result: false, message: "Please input valid location!" };
  }
  return { result: true };
};
