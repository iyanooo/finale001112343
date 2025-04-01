const MedicalRecord = artifacts.require("MedicalRecord");

contract("MedicalRecord", accounts => {
  let medicalRecord;
  const doctor = accounts[0];
  const patientId = "patient123";
  const ipfsHash = "QmTest123";

  beforeEach(async () => {
    medicalRecord = await MedicalRecord.new();
  });

  it("should add a new record", async () => {
    await medicalRecord.addRecord(patientId, ipfsHash, { from: doctor });
    
    const records = await medicalRecord.getRecords(patientId);
    assert.equal(records.length, 1, "Record was not added");
    assert.equal(records[0].ipfsHash, ipfsHash, "IPFS hash does not match");
    assert.equal(records[0].patientId, patientId, "Patient ID does not match");
    assert.equal(records[0].doctor, doctor, "Doctor address does not match");
  });

  it("should retrieve patient records", async () => {
    await medicalRecord.addRecord(patientId, ipfsHash, { from: doctor });
    await medicalRecord.addRecord(patientId, "QmTest456", { from: doctor });
    
    const records = await medicalRecord.getRecords(patientId);
    assert.equal(records.length, 2, "Incorrect number of records");
  });
});