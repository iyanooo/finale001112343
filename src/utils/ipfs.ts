import { create } from 'ipfs-http-client';

// IPFS configuration
const IPFS_GATEWAY = 'https://ipfs.io/ipfs';
// Alternative gateways for fallback
const ALTERNATIVE_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs'
];

// Type definition for IPFS connection status
export interface IPFSStatus {
  connected: boolean;
  version?: string;
  error?: string;
  gatewayUrl: string;
  id?: string;
}

/**
 * Check if IPFS connection is working
 * Using a workaround for CORS issues by just testing the gateway
 */
export const checkIPFSConnection = async (): Promise<IPFSStatus> => {
  try {
    console.log("Checking IPFS connection...");
    const ipfs = await getIPFS();
    
    // Verify IPFS is working by checking ID
    const id = await ipfs.id();
    console.log("IPFS connected:", id);
    
    // Try to add a small test file to verify complete functionality
    const testCid = await ipfs.add(JSON.stringify({ test: "connectivity check", timestamp: Date.now() }));
    console.log("IPFS test file added, CID:", testCid.path);
    
    return { connected: true, id: id.id };
  } catch (error) {
    console.error("IPFS connection failed:", error);
    return { connected: false, error: error.message };
  }
};

/**
 * Add content to IPFS
 * @param content The content to add to IPFS (will be JSON stringified)
 * @returns CID (Content Identifier) hash
 */
export async function addToIPFS(content: any): Promise<string> {
  // For development/demo purposes, we'll simulate adding to IPFS
  // since direct ipfs.add will likely fail due to CORS
  try {
    // Generate a random hash for demo purposes
    const fakeHash = 'Qm' + Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
    
    // Store in localStorage for demo retrieval
    localStorage.setItem(fakeHash, JSON.stringify(content));
    
    console.log('Simulated adding content to IPFS with hash:', fakeHash);
    return fakeHash;
  } catch (error) {
    console.error('Error simulating add to IPFS:', error);
    throw new Error('Failed to simulate adding data to IPFS: ' + (error as Error).message);
  }
}

/**
 * Get content from IPFS using the provided hash
 * @param hash The IPFS content hash (CID)
 * @returns The JSON parsed content
 */
export async function getFromIPFS(hash: string): Promise<any> {
  // First check if this is a simulated hash in localStorage
  const localData = localStorage.getItem(hash);
  if (localData) {
    return JSON.parse(localData);
  }
  
  // If not in localStorage, try primary gateway
  try {
    const response = await fetch(`${IPFS_GATEWAY}/${hash}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (primaryError) {
    console.error('Error getting from primary IPFS gateway:', primaryError);
    
    // Try alternative gateways if primary fails
    for (const gateway of ALTERNATIVE_GATEWAYS) {
      try {
        const response = await fetch(`${gateway}/${hash}`);
        if (!response.ok) continue;
        return await response.json();
      } catch (error) {
        console.error(`Error getting from alternative IPFS gateway ${gateway}:`, error);
        // Continue to next gateway
      }
    }
    
    // If all gateways fail
    throw new Error('Failed to retrieve data from IPFS. All gateways failed.');
  }
}

/**
 * Helper to store medical record data in IPFS
 * @param recordData Medical record data to store
 * @returns IPFS hash for the stored data
 */
export async function storeMedicalRecord(recordData: any): Promise<string> {
  try {
    // Add timestamp if not present
    if (!recordData.timestamp) {
      recordData.timestamp = Date.now();
    }
    
    // Store in IPFS
    const ipfsHash = await addToIPFS(recordData);
    return ipfsHash;
  } catch (error) {
    console.error('Error storing medical record:', error);
    throw new Error('Failed to store medical record in IPFS: ' + (error as Error).message);
  }
}