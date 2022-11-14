const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { getProfile } = require("./middleware/getProfile");
const { Op } = require("sequelize");
const app = express();

app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

/**
 *
 * @returns contract by id
 */
app.get("/contracts/:id", getProfile, async (req, res) => {
  try {
    const { Contract } = req.app.get("models");
    const { id } = req.params;
    const profileId = req?.headers?.profile_id;
    const contract = await Contract.findOne({
      where: {
        id,
        [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
      },
    });
    if (!contract.length) return res.status(204).end();
    res.json(contract);
  } catch (error) {
    return res.status(500).json({ message: error?.message });
  }
});

/**
 *
 * @returns All contracts that are non terminated and belong to a client or contractor
 */
app.get("/contracts", getProfile, async (req, res) => {
  try {
    const { Contract } = req.app.get("models");
    const profileId = req?.headers?.profile_id;

    const contracts = await Contract.findAll({
      where: {
        [Op.not]: [{ status: "terminated" }],
        [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
      },
    });

    if (!contracts.length) return res.status(204).end();
    res.json(contracts);
  } catch (error) {
    return res.status(500).json({ message: error?.message });
  }
});

module.exports = app;
