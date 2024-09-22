import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Folder, Logout, Settings } from "@mui/icons-material"
import { Avatar, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material"
import logo from '/logo.png'
import api from "../networking/endpoints";

function Nav() {
    const navigate = useNavigate()
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
            sx={{ backgroundColor: "#747bff", paddingY: 2, paddingX: 4 }}>

            <img src={logo} style={{ maxHeight: 40 }} />

            <Typography variant="h4">Welcome</Typography>

            <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ py: 0 }}>
                    <Avatar />
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