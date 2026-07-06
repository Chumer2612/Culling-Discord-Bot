const { getPool } = require("./database");

async function cleanupAdminActions() {
  try {
    const pool = getPool();

    const [doneResult] = await pool.execute(
      `
      DELETE FROM culling_discord_admin_actions
      WHERE status = 'DONE'
        AND processed_at < (NOW() - INTERVAL 7 DAY)
      `
    );

    const [failedResult] = await pool.execute(
      `
      DELETE FROM culling_discord_admin_actions
      WHERE status = 'FAILED'
        AND processed_at < (NOW() - INTERVAL 30 DAY)
      `
    );

    const [stuckResult] = await pool.execute(
      `
      DELETE FROM culling_discord_admin_actions
      WHERE status IN ('PENDING', 'PROCESSING')
        AND created_at < (NOW() - INTERVAL 1 DAY)
      `
    );

    const total =
      doneResult.affectedRows +
      failedResult.affectedRows +
      stuckResult.affectedRows;

    if (total > 0) {
      console.log(
        `[CullingBot] Ações admin antigas removidas: ${total} ` +
          `(DONE=${doneResult.affectedRows}, FAILED=${failedResult.affectedRows}, STUCK=${stuckResult.affectedRows})`
      );
    }
  } catch (error) {
    console.error("[CullingBot] Erro ao limpar ações admin:", error);
  }
}

module.exports = {
  cleanupAdminActions,
};