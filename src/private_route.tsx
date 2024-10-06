import { ReactNode, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"

import api from "./networking/endpoints"
import { getErrorString } from "./utilities/utils"
import { useDispatch } from "react-redux"
import { saveCreds } from "./store/reducer"

type IProps = {
    children: ReactNode | ReactNode[]
}

function PrivateRoute({ children }: IProps) {
    const navigate = useNavigate()
    const dispatch = useDispatch()

    // Load user info from API. If it fails user needs authentication so route to login page
    const checkAuth = useCallback(async () => {
        try {
            const resp = await api.getSession()
            dispatch(saveCreds({
                emailAddress: resp.data.email_address,
                createdAt: resp.data.created_at,
                lastSeen: resp.data.last_seen,
            }))
        } catch (err: unknown) {
            const message = getErrorString(err)
            console.warn("Authentication required:", message)
            navigate("/login")
        }
    }, [navigate])

    useEffect(() => {
        checkAuth()
    }, [])

    return (
        <>
            {children}
        </>
    )
}


export default PrivateRoute