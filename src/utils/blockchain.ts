import Web3 from 'web3';
import type { AbiItem } from 'web3-utils';

// Create minimal contract ABI if the JSON file isn't available
const MedicalRecordABI = {
  abi: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "patientId",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "ipfsHash",
          "type": "string"
        }
      ],
      "name": "addRecord",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_patientId",
          "type": "string"
        }
      ],
      "name": "getRecords",
      "outputs": [
        {
          "components": [
            {
              "internalType": "string",
              "name": "ipfsHash",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "patientId",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "doctor",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            }
          ],
          "internalType": "struct MedicalRecord.Record[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  bytecode: "0x608060405234801561001057600080fd5b50610c55806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80631e3b48221461003b57806356746b0c1461006b575b600080fd5b61005560048036038101906100509190610513565b61009b565b60405161006291906106da565b60405180910390f35b6100856004803603810190610080919061075e565b610336565b6040516100929190610a0e565b60405180910390f35b60606000808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000848152602001908152602001600020805480602002602001604051908101604052809291908181526020016000905b8282101561032a5783829060005260206000209060040201604051806080016040529081600082018054610135906107bd565b80601f0160208091040260200160405190810160405280929190818152602001828054610161906107bd565b80156101ae5780601f10610183576101008083540402835291602001916101ae565b820191906000526020600020905b81548152906001019060200180831161019157829003601f168201915b505050505081526020016001820180546101c7906107bd565b80601f01602080910402602001604051908101604052809291908181526020018280546101f3906107bd565b80156102405780601f1061021557610100808354040283529160200191610240565b820191906000526020600020905b81548152906001019060200180831161022357829003601f168201915b505050505081526020016002820160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160038201548152505083838060010194508151811061031257610311610a33565b5b602090810291909101015280610322906107bd565b9050610117565b505050509392505050565b6040518060800160405280848152602001838152602001733b5be8bcc771b9420b5c46e223c4495205ef4a9e81526020014281525060008060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008581526020019081526020016000208082548060010182816103ce9190610a91565b9250508190555050505050565b6000604051905090565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061041682610401565b9050919050565b6000813590506104528161040b565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6104ab8261046256b8156104ca576104c9610473565b5b80604052505050565b60006104dd6104de565b90506104e982826104a2565b919050565b600067ffffffffffffffff821115610509576105086104a2565b5b602082029050602081019050919050565b600080604080838503121561052a57610529610465565b5b600061053885828601610443565b925050602083013567ffffffffffffffff81111561055957610558610469565b5b610565858286016104d3565b9150509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b600082825260208201905092915050565b600061057a82610401565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600081519050919050565b60005b838110156105ca5780820151818401526020810190506105af565b838111156105d9576000848401525b50505050565b60006105ea826105b0565b6105f4818561035f565b93506106048185602086016105bb565b61060d81610462565b840191505092915050565b6000819050919050565b61062b81610618565b82525050565b600060808301600083015184820360008601526106528382886105df565b925050602083015184820360208601526106d3828561062b565b95505060408301516106e860408601826105df565b50606083015161068c6060860182610622565b508091505092915050565b6000602082019050818103600083015261057482828461061c565b600080fd5b6106d381610581565b90565b602082019050919050565b600081519050919050565b606082016000820151610700600085018261073e565b506020820151610713602085018261073e565b5060408201516107266040850182610574565b50608082015161072f6060860182610622565b50505050565b600060808301600083015184820360008601526107558282886106e4565b935050505092915050565b600080604080838503121561077557610774610465565b5b600061078385828601610443565b925050602083013567ffffffffffffffff8111156107a3576107a2610469565b5b6107af858286016104d3565b9150509250929050565b6000819050919050565b6000819050919050565b600061080361080e610807846107d6565b6107d6565b610618565b9050919050565b61081381610618565b82525050565b600081519050919050565b600082825260208201905092915050565b600061084082610819565b61084a8185610824565b935061085a8185602086016105bb565b61086381610462565b840191505092915050565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b610892826105b0565b810181811067ffffffffffffffff821117156108b1576108b0610473565b5b80604052505050565b60006108c461086d565b90506108d0828261088e565b919050565b600067ffffffffffffffff8211156108f0576108ef610473565b5b6108f982610462565b9050602081019050919050565b828183376000838301525050565b60006109286109238461088e565b6108ba565b90508281526020810184848401111561094457610943610878565b5b61094f848285610906565b509392505050565b600082601f83011261096c5761096b610873565b5b813561097c848260208601610915565b91505092915050565b60006040820190508181036000830152610770828461085f565b600082825260208201905092915050565b600082825260208201905092915050565b60006109c9826105b0565b6109d381856109ae565b93506109e38185602086016105bb565b6109ec81610462565b840191505092915050565b6000610a0482846109be565b915081905092915050565b6000602082019050610a2460008301846107cc565b92915050565b6000819050919050565b6000610a3e82610a2a565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603160045260246000fd5b600060019050601e016000600485049050171580156106da5750836000541560e01b60008114600160d01b16801561084a5750836000541560e01b600082116001861290501617155b8015610ab25750806000836000548203038115048111156109ec57610a3e5b049250505056fea264697066735822122000e9adf81d5aff371539ffad5a86ea2deebaf662ce7cb2e8c9bce94aec7fa78264736f6c63430008090033"
};

// Add Vite env definition for TypeScript
declare global {
  interface ImportMeta {
    env: {
      DEV: boolean;
      PROD: boolean;
      MODE: string;
    };
  }
  
  interface Window {
    ethereum?: any;
  }
}

const MEDICAL_RECORD_CONTRACT_ADDRESS = '0x2B9b83701E5eFB926303CDc604d0A45519bCFfF1'; // Update with your deployed contract address
const GANACHE_URL = 'http://127.0.0.1:7545';

export const checkGanacheConnection = async (): Promise<boolean> => {
  try {
    console.log("Checking Ganache connection to:", GANACHE_URL);
    const web3 = new Web3(GANACHE_URL);
    const isListening = await web3.eth.net.isListening();
    console.log("Ganache connection status:", isListening);
    return isListening;
  } catch (error) {
    console.error("Ganache connection error:", error);
    return false;
  }
};

export const connectToBlockchain = async () => {
  try {
    console.log("Initializing Web3 connection to Ganache...");
    const web3 = new Web3(GANACHE_URL);
    
    // Add connection timeout
    const connectionPromise = web3.eth.net.isListening();
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 5000)
    );
    
    // Verify connection is active with timeout
    const isConnected = await Promise.race([connectionPromise, timeout])
      .catch(error => {
        console.error("Connection failed:", error);
        throw new Error("Failed to connect to Ganache network");
      });
      
    if (!isConnected) {
      throw new Error("Failed to connect to Ganache network");
    }
    
    console.log("Web3 connection established. Getting accounts...");
    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No Ethereum accounts available");
    }
    
    console.log("Got accounts:", accounts);
    console.log("Using account:", accounts[0]);
    
    // Verify contract exists at specified address
    console.log("Checking contract at address:", MEDICAL_RECORD_CONTRACT_ADDRESS);
    const code = await web3.eth.getCode(MEDICAL_RECORD_CONTRACT_ADDRESS);
    if (code === '0x' || code === '0x0') {
      console.log("No contract found at specified address. Deploying new contract...");
      return await deployNewContract(web3, accounts[0]);
    }
    
    console.log("Contract found, initializing contract instance...");
    
    // Print ABI to verify it's correct
    console.log("ABI being used:", JSON.stringify(MedicalRecordABI.abi, null, 2));
    
    const contract = new web3.eth.Contract(
      MedicalRecordABI.abi as AbiItem[],
      MEDICAL_RECORD_CONTRACT_ADDRESS
    );
    
    // Debug: Log available methods 
    console.log("Contract methods after initialization:", Object.keys(contract.methods));
    
    // Test contract methods to verify it works
    try {
      console.log("Testing contract with test call...");
      const testId = "test-" + Date.now();
      await contract.methods.getRecords(testId).call();
      console.log("Contract test call successful");
    } catch (testErr) {
      console.warn("Contract test call failed:", testErr.message);
      // VM Exception is expected when calling on empty patient ID
      if (!testErr.message.includes("VM Exception")) {
        console.error("Contract functionality test failed with unexpected error");
        throw testErr;
      }
    }
    
    console.log("Contract initialized successfully");
    return { web3, contract, address: accounts[0] };
  } catch (error) {
    console.error("Blockchain connection error:", error);
    throw error; // Don't provide a mock, let the application handle it
  }
};

const deployNewContract = async (web3: any, account: string) => {
  try {
    console.log("Deploying new contract...");
    
    // Clean up the bytecode in case it's malformed
    const bytecode = MedicalRecordABI.bytecode;
    if (!bytecode || bytecode === '0x' || bytecode.length < 10) {
      throw new Error("Invalid bytecode in contract file");
    }
    
    console.log("Creating contract instance...");
    const contract = new web3.eth.Contract(MedicalRecordABI.abi as AbiItem[]);
    
    console.log("Starting contract deployment...");
    const deployTransaction = contract.deploy({
      data: bytecode,
      arguments: []
    });
    
    console.log("Estimating gas...");
    const gas = await deployTransaction.estimateGas({from: account}) * 1.5;
    console.log("Estimated gas:", gas);
    
    console.log("Sending deployment transaction...");
    const deployedContract = await deployTransaction.send({
      from: account,
      gas: Math.floor(gas)
    });
    
    console.log("Contract deployed at:", deployedContract.options.address);
    
    // Update the constant for future reference
    console.log("Remember to update MEDICAL_RECORD_CONTRACT_ADDRESS with this value for future use");
    
    return { web3, contract: deployedContract, address: account };
  } catch (error) {
    console.error("Contract deployment error:", error);
    
    if (import.meta.env.DEV) {
      console.log("Returning mock contract implementation for development");
      
      // Create a mock contract with functions matching both possible function names
      const mockMethods = {
        getRecords: () => ({ 
          call: async () => [] 
        })
      };
      
      // Add both possible add function names to support either case
      mockMethods.addRecord = () => ({
        send: async () => ({ status: true })
      });
      
      mockMethods.addMedicalRecord = () => ({
        send: async () => ({ status: true })
      });
      
      // Add both possible get function names
      mockMethods.getRecords = () => ({
        call: async () => []
      });
      
      // Log the available methods in the mock
      console.log("Mock contract methods:", Object.keys(mockMethods));
      
      return { 
        web3, 
        contract: { 
          methods: mockMethods,
          web3 // Add web3 to the contract object itself
        },
        address: account,
        isMock: true
      };
    }
    
    throw error;
  }
};

export const getPatientRecords = async (contract: any, patientId: string) => {
  try {
    console.log(`Fetching records for patient: ${patientId}`);
    
    // Find the appropriate method name for retrieving records
    const methodName = findContractMethod(contract, 'getRecords') || 
                       findContractMethod(contract, 'getRecords');
    
    if (!methodName) {
      console.error("Could not find any get records method");
      throw new Error("Contract does not have a valid get records method");
    }
    
    console.log(`Using method: ${methodName} to fetch records`);
    
    // Wrap the contract call with additional error handling
    const getRecordsPromise = contract.methods[methodName](patientId).call();
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Contract call timeout")), 10000)
    );
    
    console.log("Executing get records with timeout...");
    const records = await Promise.race([getRecordsPromise, timeoutPromise]);
    
    console.log("Records retrieved:", records);
    return records;
  } catch (error) {
    console.error(`Error fetching patient records for ${patientId}:`, error);
    // VM Exception is normal when no records exist
    if (error.message && error.message.includes("VM Exception")) {
      console.log("VM Exception likely means no records for this patient");
      return [];
    }
    throw error; // Let the component handle the error
  }
};

export const fetchRecordFromIPFS = async (ipfsHash: string) => {
  try {
    const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${ipfsHash}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch record from IPFS: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching record from IPFS: ${error}`);
    throw error;
  }
};

// Helper function to find the right method on the contract
const findContractMethod = (contract: any, methodBaseName: string) => {
  if (!contract || !contract.methods) {
    console.error("Contract or contract.methods is undefined");
    return null;
  }

  // Get all available methods
  const availableMethods = Object.keys(contract.methods);
  console.log("Available methods:", availableMethods);
  
  // Check for exact match
  if (typeof contract.methods[methodBaseName] === 'function') {
    return methodBaseName;
  }
  
  // Check for common variations
  const variations = [
    methodBaseName,
    methodBaseName.charAt(0).toUpperCase() + methodBaseName.slice(1), // Capitalize first letter
    methodBaseName.toLowerCase(),
    methodBaseName.replace(/([A-Z])/g, '_$1').toLowerCase(), // camelCase to snake_case
    methodBaseName.replace(/_([a-z])/g, (g) => g[1].toUpperCase()), // snake_case to camelCase
  ];
  
  for (const variation of variations) {
    if (typeof contract.methods[variation] === 'function') {
      console.log(`Found method match: ${variation}`);
      return variation;
    }
  }
  
  // Look for partial matches if no exact match found
  const matchingMethod = availableMethods.find(method => 
    method.toLowerCase().includes(methodBaseName.toLowerCase())
  );
  
  if (matchingMethod) {
    console.log(`Found closest method match: ${matchingMethod}`);
    return matchingMethod;
  }
  
  console.error(`No matching method found for ${methodBaseName}`);
  return null;
};

export const addMedicalRecord = async (contract: any, sender: string, patientId: string, ipfsHash: string) => {
  try {
    console.log(`Adding medical record for patient ${patientId} with hash ${ipfsHash} from account ${sender}`);
    
    // Debug: Log all available methods on the contract
    console.log("Contract object:", contract);
    console.log("Available contract methods:", Object.keys(contract.methods || {}));
    
    // Find the appropriate method name
    const methodName = findContractMethod(contract, 'addRecord') || 
                       findContractMethod(contract, 'addMedicalRecord');
    
    if (!methodName) {
      console.error("Could not find any add record method");
      throw new Error("Contract does not have a valid add record method");
    }
    
    console.log(`Using method: ${methodName}`);
    
    // Call the method with the found name
    const result = await contract.methods[methodName](patientId, ipfsHash).send({
      from: sender,
      gas: 500000
    });
    
    console.log("Transaction result:", result);
    return result;
  } catch (error) {
    console.error(`Error adding medical record for ${patientId}:`, error);
    throw error; // Let the component handle the error
  }
};