import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import Folder from "@mui/icons-material/Folder"
import Logout from "@mui/icons-material/Logout"
import Settings from "@mui/icons-material/Settings"
import Person from "@mui/icons-material/Person"
import Avatar from "@mui/material/Avatar"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"

import api from "../networking/endpoints"
import { RootState } from "../store/store"
import logo from '/logo.png'

function Nav() {
    const navigate = useNavigate()
    const emailAddress = useSelector((state: RootState) => state.user.emailAddress)
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null)

    const handleOpenUserMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    }, [])

    const handleCloseUserMenu = useCallback(() => {
        setAnchorElUser(null);
    }, [])

    const openDashboard = useCallback(() => {
        handleCloseUserMenu()
        navigate("/dashboard")
    }, [navigate, handleCloseUserMenu])

    const openSettings = useCallback(() => {
        handleCloseUserMenu()
        navigate("/settings")
    }, [navigate, handleCloseUserMenu])

    const logout = useCallback(async () => {
        try {
            await api.logout()
            handleCloseUserMenu()
            navigate("/login")
        } catch (err) {
            console.error("Failed to logout:", err)
        }
    }, [navigate, handleCloseUserMenu])

    return (
        <Stack spacing={5}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width="100vw"
            sx={{ backgroundColor: "transparent", paddingY: 2, paddingX: 6 }}>

            <img src={logo} width={30} height={30} />


            <Tooltip title="My Account">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, gap: 1 }} disableRipple>
                    <Typography variant="body2" color="info">{emailAddress}</Typography>
                    <Avatar><Person color="info" /></Avatar>
                </IconButton>
            </Tooltip>

            <Menu sx={{ mt: '45px' }}
                id="menu-appbar"
                keepMounted
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}>

                <MenuItem onClick={openDashboard} sx={{ paddingX: 5 }}>
                    <ListItemIcon><Folder fontSize="small" color="primary" /></ListItemIcon>
                    My Files
                </MenuItem>
                <MenuItem onClick={openSettings} sx={{ paddingX: 5 }}>
                    <ListItemIcon><Settings fontSize="small" color="primary" /></ListItemIcon>
                    Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={logout} sx={{ paddingX: 5 }}>
                    <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                    Logout
                </MenuItem>
            </Menu>

        </Stack>
    )
}

export default Nav