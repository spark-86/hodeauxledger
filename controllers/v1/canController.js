/****
 *  This is supposed to return if we can audit|author a ledger
 */
export const getCan = async (req, res) => {
    const { roleId, ledgerId } = req.params;

    return res.status(200).json({ data: roleId });
};
