import doctorsData from './doctors.json' with { type: "json" };

// Type for doctor mapping
interface DoctorMap {
  [address: string]: string;
}

const doctors: DoctorMap = doctorsData;

export const getDoctorName = (address: string): string => {
  const normalizedAddress = address.toLowerCase(); // Ensure case-insensitive lookup
  return doctors[normalizedAddress] || `Unknown Doctor (${address.substring(0, 8)}...)`;
};