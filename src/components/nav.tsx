import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Logout, Password, Settings } from "@mui/icons-material"
import { Avatar, Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material"
import logo from '/logo.png'
import api from "../networking/endpoints";

function Nav() {
    const navigate = useNavigate()
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null)

    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

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

            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>

                <Tooltip title="Open settings">
                    <IconButton onClick={handleOpenUserMenu} sx={{ py: 0 }}>
                        <Avatar alt="Remy Sharp" src="/static/images/avatar/2.jpg" />
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

                    <MenuItem onClick={() => { }} disabled>
                        <ListItemIcon>
                            <Settings fontSize="small" />
                        </ListItemIcon>
                        Settings
                    </MenuItem>
                    <MenuItem onClick={() => { }} disabled>
                        <ListItemIcon>
                            <Password fontSize="small" />
                        </ListItemIcon>
                        Change Password
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={logout}>
                        <ListItemIcon>
                            <Logout fontSize="small" />
                        </ListItemIcon>
                        Logout
                    </MenuItem>
                </Menu>
            </Box>

        </Stack>
    )
}

export default Nav