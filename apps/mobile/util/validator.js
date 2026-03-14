export const validateREQ = (req) => {
  if (!req || req.trim() === "") {
    return false;
  }
  if (isNaN(req)) {
    return false;
  }
  return true;
};

export const validateAccountName = (name) => {
  if (!name || name.trim() === "") return false;
  const nameRegex = /^[a-zA-Z\s\-']{2,100}$/;
  if (!nameRegex.test(name.trim())) {
    return false;
  }
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

export const validateWorkType = (workType) => {
  if (!workType || workType.trim() === "") return false;
  return true;
};

export const validatePlantWork = (plantWork) => {
  if (!plantWork || plantWork.trim() === "") return false;
  return true;
};

export const validatePlantLocation = (plantLocation) => {
  if (!plantLocation || plantLocation.trim() === "") return false;
  return true;
};

export const validatePlantNeeded = (plantNeeded) => {
  if (!plantNeeded || plantNeeded.trim() === "") return false;
  return true;
};

export const validateAccContact = (accContact) => {
  if (!accContact || accContact.trim() === "") return false;
  return true;
};

export const validateWorkRequest = (requestForm) => {
  if (!validateREQ(requestForm.req)) {
    return { result: false, message: "Please input valid REQ!" };
  }
  if (!validateAccountName(requestForm.accountName)) {
    return { result: false, message: "Please input valid accountName!" };
  }
  if (!validateAddress(requestForm.address)) {
    return { result: false, message: "Please input valid address!" };
  }
  if (!validateWorkType(requestForm.workType)) {
    return { result: false, message: "Please input valid workType!" };
  }
  if (!validatePlantWork(requestForm.plantWork)) {
    return { result: false, message: "Please input valid plantWork!" };
  }
  if (!validatePlantLocation(requestForm.plantLocation)) {
    return { result: false, message: "Please input valid plantLocation!" };
  }
  if (!validatePlantNeeded(requestForm.plantNeeded)) {
    return { result: false, message: "Please input valid plantNeeded!" };
  }
  if (!validateAccContact(requestForm.accountContact)) {
    return { result: false, message: "Please input valid accountContact!" };
  }
  return { result: true };
};
