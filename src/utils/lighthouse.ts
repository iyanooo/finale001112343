import lighthouse from '@lighthouse-web3/sdk';

// You'll need to sign up at https://files.lighthouse.storage/ to get an API key
// Replace this with your actual API key
const API_KEY = "53af1bce.381b56fa889d4f338836d210d1678c21";

export interface LighthouseStatus {
  connected: boolean;
  error?: string;
}

export async function checkLighthouseConnection(): Promise<LighthouseStatus> {
  try {
    // Try to get balance using the API key - this is a simple way to verify API key works
    const balance = await lighthouse.getBalance(API_KEY);
    console.log("Lighthouse connection successful. Balance:", balance);
    return { connected: true };
  } catch (error) {
    console.error("Lighthouse connection error:", error);
    return { 
      connected: false, 
      error: error.message || 'Failed to connect to Lighthouse' 
    };
  }
}

export async function storeMedicalRecord(data: any): Promise<string> {
  try {
    // Convert the data to a JSON string
    const jsonString = JSON.stringify(data);
    
    // Use the uploadText method directly
    const name = `medical_record_${Date.now()}`;
    const response = await lighthouse.uploadText(jsonString, API_KEY, name);
    
    console.log("Lighthouse upload response:", response);
    
    // Return the CID (Content Identifier)
    return response.data.Hash;
  } catch (error) {
    console.error("Error storing data in Lighthouse:", error);
    throw new Error(`Failed to store data in Lighthouse: ${error.message}`);
  }
}

export async function getFromLighthouse(cid: string): Promise<any> {
  try {
    // Fetch data from Lighthouse using the CID
    const url = `https://gateway.lighthouse.storage/ipfs/${cid}`;
    console.log("Fetching data from Lighthouse:", url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error retrieving data from Lighthouse (CID: ${cid}):`, error);
    throw new Error(`Failed to retrieve data from Lighthouse: ${error.message}`);
  }
}

export async function verifyCID(cid: string): Promise<boolean> {
  try {
    const url = `https://gateway.lighthouse.storage/ipfs/${cid}`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error(`Error verifying CID ${cid}:`, error);
    return false;
  }
}

export async function getAllPatientRecordsFromLighthouse(patientId: string, apiKey: string = API_KEY): Promise<any[]> {
  try {
    console.log(`Fetching all Lighthouse records for patient: ${patientId}`);
    
    // Get all uploads for this API key
    const uploads = await lighthouse.getUploads(apiKey);
    console.log(`Found ${uploads.data.totalItems} total uploads in Lighthouse`);
    
    if (!uploads.data.fileList || uploads.data.fileList.length === 0) {
      console.log("No files found in Lighthouse");
      return [];
    }
    
    // Filter and fetch records related to this patient
    const patientRecords = [];
    
    for (const file of uploads.data.fileList) {
      try {
        // Fetch the actual data from each record
        const data = await getFromLighthouse(file.cid);
        
        // Check if this record belongs to the specified patient
        if (data && data.patientId === patientId) {
          patientRecords.push({
            ipfsHash: file.cid,
            name: file.fileName,
            created: new Date(file.createdAt).toISOString(),
            patientId: data.patientId,
            data
          });
        }
      } catch (error) {
        console.error(`Error fetching data for CID ${file.cid}:`, error);
        // Continue with other records even if one fails
      }
    }
    
    console.log(`Found ${patientRecords.length} records for patient ${patientId}`);
    return patientRecords;
  } catch (error) {
    console.error("Error getting patient records from Lighthouse:", error);
    throw new Error(`Failed to get patient records from Lighthouse: ${error.message}`);
  }
} 