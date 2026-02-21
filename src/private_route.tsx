import { ReactNode, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import api from './networking/endpoints';
import { getErrorString } from './utilities/utils';
import { saveCreds } from './store/reducer';
import { RootState } from './store/store';

type IProps = {
    children: ReactNode | ReactNode[];
};

function PrivateRoute({ children }: IProps) {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const emailAddress = useSelector((state: RootState) => state.user.emailAddress);
    const wrappedAccountKey = useSelector((state: RootState) => state.user.wrappedAccountKey);

    // Load user info from API. If it fails user needs authentication so route to login page
    const checkAuth = useCallback(async () => {
        try {
            const resp = await api.getSession();
            dispatch(
                saveCreds({
                    emailAddress: resp.data.email_address,
                    createdAt: resp.data.created_at,
                    lastSeen: resp.data.last_seen,
                    wrappedAccountKey: resp.data.wrapped_account_key,
                    allowedStorage: resp.data.allowed_storage,
                }),
            );
        } catch (err: unknown) {
            const message = getErrorString(err);
            console.warn('Authentication required:', message);
            navigate('/login');
        }
    }, [navigate, dispatch]);

    useEffect(() => {
        // If store is lacking important data, fetch it from the backend
        if (!emailAddress || !wrappedAccountKey) {
            checkAuth();
        }
    }, [emailAddress, wrappedAccountKey, checkAuth]);

    return <>{children}</>;
}

export default PrivateRoute;
