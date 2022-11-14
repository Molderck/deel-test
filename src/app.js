const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { getProfile } = require("./middleware/getProfile");
const { Op, Sequelize } = require("sequelize");
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

/**
 *
 * @returns all unpaid jobs for a client or contractor for active only contracts
 */
app.get("/jobs/unpaid", getProfile, async (req, res) => {
  try {
    const { Job, Contract } = req.app.get("models");
    const profileId = req?.headers?.profile_id;

    const unpaidJobs = await Job.findAll({
      where: {
        paid: null,
      },
      include: [
        {
          model: Contract,
          where: {
            [Op.not]: [{ status: "terminated" }],
            [Op.or]: [{ ClientId: profileId }, { ContractorId: profileId }],
          },
        },
      ],
    });

    if (!unpaidJobs.length) return res.status(204).end();
    res.json(unpaidJobs);
  } catch (error) {
    return res.status(500).json({ message: error?.message });
  }
});

/**
 *
 * @returns deposit up to 25% to client
 */
app.get("/balances/deposit/:userId", getProfile, async (req, res) => {
  try {
    const { Contract, Job, Profile } = req.app.get("models");
    const { userId } = req.params;
    const TOTAL_JOBS_TO_PAY_PERCENTAGE_LIMIT = 0.25;

    let possibleAmountToDeposit = await Contract.findAll({
      where: {
        ClientId: userId,
      },
      attributes: [],
      include: [
        {
          model: Job,
          where: {
            paid: 1,
          },
          attributes: [
            [sequelize.fn("sum", sequelize.col("price")), "priceTotal"],
          ],
        },
      ],
    });

    possibleAmountToDeposit = Math.floor(
      possibleAmountToDeposit[0].dataValues["Jobs"][0].dataValues.priceTotal *
        TOTAL_JOBS_TO_PAY_PERCENTAGE_LIMIT
    );

    const clientPayment = await Profile.increment(
      { balance: possibleAmountToDeposit },
      {
        where: {
          id: userId,
        },
      }
    );

    if (!clientPayment.length) return res.status(204).end();
    res.status(200).end();
  } catch (error) {
    return res.status(500).json({ message: error?.message });
  }
});

module.exports = app;
