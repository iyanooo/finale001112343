// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MedicalRecord {
    struct Record {
        string ipfsHash;
        string patientId;
        address doctor;
        uint256 timestamp;
    }

    // Mapping from patient ID to their records
    mapping(string => Record[]) private patientRecords;
    
    // Event emitted when a new record is added
    event RecordAdded(
        string patientId,
        string ipfsHash,
        address doctor,
        uint256 timestamp
    );

    // Add a new medical record
    function addRecord(string memory _patientId, string memory _ipfsHash) public {
        Record memory newRecord = Record({
            ipfsHash: _ipfsHash,
            patientId: _patientId,
            doctor: msg.sender,
            timestamp: block.timestamp
        });
        
        patientRecords[_patientId].push(newRecord);
        
        emit RecordAdded(_patientId, _ipfsHash, msg.sender, block.timestamp);
    }

    // Get all records for a patient
    function getRecords(string memory _patientId) public view returns (Record[] memory) {
        return patientRecords[_patientId];
    }
}