
export const successStatus =(status: number) => {
    return status >= 200 && status <= 299;
}

export const redirectStatus = (status: number) => {
    return status >= 300 && status <= 399;
}

export const clientErrorStatus = (status: number) => {
    return status >= 400 && status <= 499;
}

export const serverErrorStatus = (status: number) => {
    return status >= 500 && status <= 599;
}

export const errorStatus = (status: number) => {
    return clientErrorStatus(status) || serverErrorStatus(status);
}