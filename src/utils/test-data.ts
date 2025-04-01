export const mockVitalSigns = [
  {
    ipfsHash: 'QmTestHash1',
    patientId: 'patient-123',
    doctor: '0x0970AF2d10d52678733301b6e08893dc71Ca67a0',
    timestamp: String(Math.floor(Date.now() / 1000) - 86400),
    data: {
      bloodPressure: "120/80",
      bodyWeight: 70,
      temperature: 36.8,
      allergies: ["Penicillin"],
      timestamp: Date.now() - 86400000,
      recordedBy: "0x0970AF2d10d52678733301b6e08893dc71Ca67a0"
    }
  },
  {
    ipfsHash: 'QmTestHash2',
    patientId: 'patient-123',
    doctor: '0x0970AF2d10d52678733301b6e08893dc71Ca67a0',
    timestamp: String(Math.floor(Date.now() / 1000) - 172800),
    data: {
      bloodPressure: "118/75",
      bodyWeight: 69.5,
      temperature: 37.1,
      allergies: ["Penicillin", "Dust"],
      timestamp: Date.now() - 172800000,
      recordedBy: "0x0970AF2d10d52678733301b6e08893dc71Ca67a0"
    }
  }
]; 