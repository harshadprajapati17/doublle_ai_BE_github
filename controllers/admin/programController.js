import {
  createProgram,
  listPrograms,
  getProgramById,
  updateProgram,
  activateProgram,
  disableProgram,
} from "../../services/programService.js";

export async function postProgram(req, res) {
  const dto = await createProgram(req.admin.id, req.body);
  res.status(201).json({ data: dto });
}

export async function getPrograms(req, res) {
  const { data, meta } = await listPrograms(req.query);
  res.status(200).json({ data, meta });
}

export async function getProgram(req, res) {
  const { data } = await getProgramById(req.params.id, req.query);
  res.status(200).json({ data });
}

export async function patchProgram(req, res) {
  const { data } = await updateProgram(req.admin.id, req.params.id, req.body);
  res.status(200).json({ data });
}

export async function postActivateProgram(req, res) {
  const { data, meta } = await activateProgram(req.admin.id, req.params.id, req.query);
  res.status(200).json({ data, ...(meta ? { meta } : {}) });
}

export async function deleteProgram(req, res) {
  const result = await disableProgram(req.admin.id, req.params.id);
  if (result.noOp) {
    return res.status(204).send();
  }
  return res.status(204).send();
}
