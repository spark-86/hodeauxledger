export const getRead = async (req, res) => {
    const { scope, record_type, id } = req.params;

    return res.status(200).json({ data: scope });
};
