export const requestList = [
  { id: 1738, submittedBy: "Magnus Mullen" },
  { id: 4123, submittedBy: "Phil Philerson" },
  { id: 7453, submittedBy: "John Doe" },
];

export const addReq = (item) => {
  const addItem = {
    id: item.req,
    submittedBy: item.accountName,
  };
  console.log(addItem);
  requestList.push(addItem);
};
