import {
  listDemoUsers,
  createDemoUser,
  getDemoUserById,
  updateDemoUser,
  deleteDemoUser,
} from "../../services/demoUserService.js";

export async function getDemoUsers(req, res) {
  const result = await listDemoUsers();
  res.status(200).json(result);
}

export async function postDemoUser(req, res) {
  const result = await createDemoUser(req.body);
  res.status(201).json(result);
}

export async function getDemoUser(req, res) {
  const result = await getDemoUserById(req.params.id);
  res.status(200).json(result);
}

export async function patchDemoUser(req, res) {
  const result = await updateDemoUser(req.params.id, req.body);
  res.status(200).json(result);
}

export async function deleteDemoUserHandler(req, res) {
  await deleteDemoUser(req.params.id);
  res.status(204).send();
}
