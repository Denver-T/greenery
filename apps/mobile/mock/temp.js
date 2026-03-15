export const requestList = [
  {
    req: 1738,
    accountName: "Magnus Mullen",
    address: "1234 Vancouer st",
    workType: "1",
    plantWork: "Branch",
    plantLocation: "A",
    plantNeeded: "Yes",
    accountContact: "1234",
  },
  {
    req: 4123,
    accountName: "Phil Philerson",
    address: "5720 Silver Springs Blvd NW",
    workType: "2",
    plantWork: "Branch",
    plantLocation: "B",
    plantNeeded: "Yes",
    accountContact: "2345",
  },
  {
    req: 7453,
    accountName: "John Doe",
    address: "800 Macleod Trl SE",
    workType: "3",
    plantWork: "Branch",
    plantLocation: "C",
    plantNeeded: "No",
    accountContact: "5678",
  },
];

export const addReq = (item) => {
  const addItem = {
    ...item,
  };
  console.log(addItem);
  requestList.push(addItem);
};

export const getItemByReq = (req) => {
  return requestList.find((item) => item.req === req);
};
