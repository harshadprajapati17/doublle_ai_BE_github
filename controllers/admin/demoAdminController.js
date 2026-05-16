import {
  listDemoAdmins,
  createDemoAdmin,
  getDemoAdminById,
  updateDemoAdmin,
  deleteDemoAdmin,
} from "../../services/demoAdminService.js";

export async function getDemoAdmins(req, res) {
  const result = await listDemoAdmins();
  res.status(200).json(result);
}

export async function postDemoAdmin(req, res) {
  const result = await createDemoAdmin(req.body);
  res.status(201).json(result);
}

export async function getDemoAdmin(req, res) {
  const result = await getDemoAdminById(req.params.id);
  res.status(200).json(result);
}

export async function patchDemoAdmin(req, res) {
  const result = await updateDemoAdmin(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteDemoAdminHandler(req, res) {
  await deleteDemoAdmin(req.params.id);
  res.status(204).send();
}
