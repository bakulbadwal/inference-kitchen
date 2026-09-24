/* GPU specs copied from Hyperscale Ledger (github.com/bakulbadwal/hyperscale-ledger), specs.json, verified 2026-08-28.
   Dense (non-sparse) tensor TFLOPS. Do not hand-edit: regenerate from the ledger. */
window.IK_GPUS = [
 {
  "id": "a100-80gb-sxm",
  "name": "A100 80GB SXM",
  "year": 2020,
  "hbmGB": 80,
  "memType": "HBM2e",
  "bwTBs": 2.039,
  "bf16TF": 312,
  "fp8TF": null,
  "fp4TF": null,
  "tdpW": 400,
  "link": "NVLink 600 GB/s; PCIe Gen4 64 GB/s",
  "src": "https://www.nvidia.com/en-us/data-center/a100/"
 },
 {
  "id": "h100-sxm",
  "name": "H100 SXM",
  "year": 2022,
  "hbmGB": 80,
  "memType": "HBM3",
  "bwTBs": 3.35,
  "bf16TF": 989.5,
  "fp8TF": 1979,
  "fp4TF": null,
  "tdpW": 700,
  "link": "NVLink 900 GB/s; PCIe Gen5 128 GB/s",
  "src": "https://www.nvidia.com/en-us/data-center/h100/"
 },
 {
  "id": "h200-sxm",
  "name": "H200 SXM",
  "year": 2023,
  "hbmGB": 141,
  "memType": "HBM3e",
  "bwTBs": 4.8,
  "bf16TF": 989.5,
  "fp8TF": 1979,
  "fp4TF": null,
  "tdpW": 700,
  "link": "NVLink 900 GB/s; PCIe Gen5 128 GB/s",
  "src": "https://www.nvidia.com/en-us/data-center/h200/"
 },
 {
  "id": "b200-sxm",
  "name": "B200",
  "year": 2024,
  "hbmGB": 180,
  "memType": "HBM3e",
  "bwTBs": 7.7,
  "bf16TF": 2250,
  "fp8TF": 4500,
  "fp4TF": 9000,
  "tdpW": 1000,
  "link": "NVLink 5th gen 1.8 TB/s per GPU; PCIe Gen5 128 GB/s",
  "src": "https://www.primeline-solutions.com/media/categories/server/nach-gpu/nvidia-blackwell-b200-datasheet.pdf"
 }
];
