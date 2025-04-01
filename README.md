# Medical Records Management System with Blockchain

This application uses blockchain (Ganache) and IPFS to securely store and retrieve patient medical records.

## Features

- Store vital signs and medical records in IPFS
- Store references to IPFS data on the blockchain
- Secure access control for patient records
- Lab test request system
- Real-time blockchain and IPFS connection status

## Requirements

- Node.js (v16+)
- Ganache (local blockchain)
- IPFS Desktop (optional)

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start Ganache (local blockchain):

```bash
npx ganache-cli --port 7545
```

4. Deploy smart contracts:

```bash
npx truffle migrate --reset --network development
```

5. Start the development server:

```bash
npm run dev
```

## How It Works

### Blockchain Integration

The application uses Ethereum smart contracts to store references to medical records. The `MedicalRecord.sol` contract provides the following functions:

- `addRecord(patientId, ipfsHash)`: Add a new medical record for a patient
- `getRecords(patientId)`: Get all records for a specific patient

### IPFS Integration

Medical record data is stored on IPFS (InterPlanetary File System), which is a distributed file system designed to make the web more secure and resilient. The system:

1. Stores the actual medical data on IPFS
2. Gets a content identifier (CID) hash from IPFS
3. Stores this hash on the blockchain
4. When retrieving records, fetches the hash from blockchain, then retrieves the data from IPFS

### Workflow

1. Doctor logs in and selects a patient
2. Doctor can view the patient's existing records (fetched from blockchain/IPFS)
3. Doctor can add new vital signs or medical records
4. The new record is stored in IPFS and its reference is stored on the blockchain
5. Doctor can request lab tests for the patient

## Security Considerations

- Medical data is stored on IPFS, which provides content addressing rather than location addressing
- Blockchain ensures data integrity and immutability
- The system includes access control mechanisms to ensure only authorized users can access patient records

## For Developers

### Structure

- `contracts/`: Contains the Solidity smart contracts
- `migrations/`: Contains the Truffle migration scripts
- `src/utils/`: Contains utilities for blockchain and IPFS integration
- `src/pages/`: Contains the React components for the application pages

### Testing

```bash
npm run test
```

### Deployment

1. Configure `truffle-config.js` for your target network
2. Deploy contracts to the target network
3. Build the frontend:

```bash
npm run build
```

4. Deploy the built application to your hosting provider 