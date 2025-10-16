
export const getSeasonShort = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    if (month < 6) {
        return `${(year - 1).toString().slice(-2)}${year.toString().slice(-2)}`;
    } else {
        return `${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
    }
}

export const getSeasonFull = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    if (month < 6) {
        return `${year - 1}/${year}`;
    } else {
        return `${year}/${year + 1}`;
    }
}
