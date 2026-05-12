const listData1 = { data: [1,2], totalRecords: 2 };
const res1 = (listData1?.data)?.data || listData1?.data || [];
console.log(res1);

const listData2 = { totalRecords: 2, data: { data: [1,2], totalRecords: 2} };
const res2 = (listData2?.data)?.data || listData2?.data || [];
console.log(res2);
